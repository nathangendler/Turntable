import json
import re
import sys
import io
import os
import random
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def scrape_album_data(url, silent_mode=False):
    chrome_options = Options()
    
    # Basic headless options
    chrome_options.add_argument('--headless')
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    
    # Aggressive GPU disabling
    chrome_options.add_argument('--disable-gpu')
    chrome_options.add_argument('--disable-gpu-sandbox')
    chrome_options.add_argument('--disable-software-rasterizer')
    chrome_options.add_argument('--disable-3d-apis')
    chrome_options.add_argument('--disable-accelerated-2d-canvas')
    chrome_options.add_argument('--disable-accelerated-jpeg-decoding')
    chrome_options.add_argument('--disable-accelerated-mjpeg-decode')
    chrome_options.add_argument('--disable-accelerated-video-decode')
    chrome_options.add_argument('--disable-gl-drawing-for-tests')
    chrome_options.add_argument('--disable-accelerated-video-encode')
    
    # Additional stability options
    chrome_options.add_argument('--disable-extensions')
    chrome_options.add_argument('--disable-plugins')
    chrome_options.add_argument('--disable-images')
    chrome_options.add_argument('--disable-javascript')  # Only if the site works without JS
    chrome_options.add_argument('--disable-web-security')
    chrome_options.add_argument('--disable-features=TranslateUI,VizDisplayCompositor')
    chrome_options.add_argument('--disable-background-timer-throttling')
    chrome_options.add_argument('--disable-backgrounding-occluded-windows')
    chrome_options.add_argument('--disable-renderer-backgrounding')
    chrome_options.add_argument('--disable-ipc-flooding-protection')
    
    # Certificate handling
    chrome_options.add_argument('--ignore-certificate-errors')
    chrome_options.add_argument('--ignore-ssl-errors')
    chrome_options.add_argument('--ignore-certificate-errors-spki-list')
    chrome_options.add_argument('--allow-running-insecure-content')
    
    # Use random port for debugging to avoid conflicts
    debug_port = random.randint(9223, 9999)
    chrome_options.add_argument(f'--remote-debugging-port={debug_port}')
    
    # User agent
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    # Memory and performance
    chrome_options.add_argument('--memory-pressure-off')
    chrome_options.add_argument('--max_old_space_size=4096')
    
    # Docker compatibility
    if os.path.exists('/usr/bin/chromium-browser'):
        chrome_options.binary_location = '/usr/bin/chromium-browser'
        if not silent_mode:
            print("Using Chromium browser (Docker environment detected)")

    driver = None
    
    try:
        # Try Docker chromedriver path first
        if os.path.exists('/usr/bin/chromedriver'):
            service = Service('/usr/bin/chromedriver')
            driver = webdriver.Chrome(service=service, options=chrome_options)
            if not silent_mode:
                print("Using ChromeDriver from /usr/bin/chromedriver (Docker)")
        else:
            # Try default Chrome setup
            driver = webdriver.Chrome(options=chrome_options)
            if not silent_mode:
                print("Using default ChromeDriver")
                
    except Exception as e:
        if not silent_mode:
            print(f"Error initializing Chrome driver: {e}")
        
        # Fallback to local paths (for development)
        possible_paths = [
            'chromedriver.exe',
            './chromedriver.exe',
            './drivers/chromedriver.exe',
            'drivers/chromedriver.exe',
            'C:/Program Files/Google/Chrome/Application/chromedriver.exe',
            'C:/chromedriver/chromedriver.exe'
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                try:
                    service = Service(path)
                    driver = webdriver.Chrome(service=service, options=chrome_options)
                    if not silent_mode:
                        print(f"Using ChromeDriver from: {path}")
                    break
                except Exception as fallback_error:
                    if not silent_mode:
                        print(f"Failed to use {path}: {fallback_error}")
                    continue
        
        if driver is None:
            error_msg = "ChromeDriver not found. Please install ChromeDriver and add it to your PATH."
            if not silent_mode:
                print(f"ERROR: {error_msg}")
            return {"error": error_msg}

    try:
        if not silent_mode:
            print(f"Loading page: {url}")
        
        # Set page load timeout
        driver.set_page_load_timeout(30)
        driver.get(url)
        
        # Wait for the page to load
        wait = WebDriverWait(driver, 15)
        
        # Try to wait for album blocks
        try:
            wait.until(EC.presence_of_element_located((By.CLASS_NAME, "albumBlock")))
        except TimeoutException:
            # If albumBlock doesn't exist, try waiting for any content
            try:
                wait.until(EC.presence_of_element_located((By.TAG_NAME, "body")))
                if not silent_mode:
                    print("Page loaded but no albumBlock found - checking page content...")
            except TimeoutException:
                if not silent_mode:
                    print("Page failed to load properly")
                return {"error": "Page load timeout"}
        
        if not silent_mode:
            print("Scrolling to load all content...")
        
        # Scroll to load content
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)
        
        # Check for "View More" button
        try:
            view_more_button = driver.find_element(By.CSS_SELECTOR, ".largeButtonContainer .largeButton")
            if view_more_button.is_displayed() and not silent_mode:
                print("Found 'View More' button - note: this links to a different page")
        except NoSuchElementException:
            pass
        
        # Find album blocks
        album_blocks = driver.find_elements(By.CLASS_NAME, "albumBlock")
        if not silent_mode:
            print(f"Found {len(album_blocks)} album blocks")
        
        if len(album_blocks) == 0:
            # Debug: Check what's actually on the page
            page_title = driver.title
            page_source_sample = driver.page_source[:500] if driver.page_source else "No page source"
            
            if not silent_mode:
                print(f"Page title: {page_title}")
                print(f"Page source sample: {page_source_sample}")
            
            return {"error": "No album blocks found", "debug_info": {
                "page_title": page_title,
                "page_source_sample": page_source_sample
            }}
        
        albums_data = []
        
        for i, block in enumerate(album_blocks):
            try:
                album_info = {}
                
                # Extract image URL
                try:
                    img_element = block.find_element(By.CSS_SELECTOR, ".image img")
                    image_url = img_element.get_attribute("src") or img_element.get_attribute("data-src")
                    album_info['image_url'] = image_url
                except NoSuchElementException:
                    album_info['image_url'] = None
                
                # Extract artist name
                try:
                    artist_element = block.find_element(By.CSS_SELECTOR, ".artistTitle")
                    album_info['artist_name'] = artist_element.text.strip()
                except NoSuchElementException:
                    try:
                        artist_div = block.find_element(By.CLASS_NAME, "artistTitle")
                        album_info['artist_name'] = artist_div.text.strip()
                    except NoSuchElementException:
                        album_info['artist_name'] = None
                
                # Extract album name
                try:
                    album_element = block.find_element(By.CSS_SELECTOR, ".albumTitle")
                    album_info['album_name'] = album_element.text.strip()
                except NoSuchElementException:
                    album_info['album_name'] = None
                
                # Extract type and release date
                try:
                    type_element = block.find_element(By.CSS_SELECTOR, ".type")
                    type_text = type_element.text.strip()
                    
                    if '•' in type_text:
                        parts = type_text.split('•')
                        if len(parts) >= 2:
                            album_info['release_date'] = parts[0].strip()
                            album_info['record_type'] = parts[1].strip()
                        else:
                            album_info['release_date'] = None
                            album_info['record_type'] = type_text
                    else:
                        album_info['release_date'] = None
                        album_info['record_type'] = type_text
                        
                except NoSuchElementException:
                    album_info['release_date'] = None
                    album_info['record_type'] = None
                
                # Extract album URL
                try:
                    album_link = block.find_element(By.CSS_SELECTOR, ".albumTitle a")
                    album_info['album_url'] = album_link.get_attribute("href")
                except NoSuchElementException:
                    try:
                        album_link = block.find_element(By.CSS_SELECTOR, ".albumTitle")
                        parent_link = album_link.find_element(By.XPATH, "./parent::a")
                        album_info['album_url'] = parent_link.get_attribute("href")
                    except NoSuchElementException:
                        album_info['album_url'] = None
                
                # Only add if we have meaningful data
                if album_info.get('album_name') or album_info.get('artist_name'):
                    albums_data.append(album_info)
                    if not silent_mode:
                        print(f"Extracted album {i+1}: {album_info.get('artist_name', 'Unknown')} - {album_info.get('album_name', 'Unknown')}")
                
            except Exception as e:
                if not silent_mode:
                    print(f"Error processing album block {i+1}: {str(e)}")
                continue
        
        if not silent_mode:
            print(f"\nSuccessfully scraped {len(albums_data)} albums")
        
        return albums_data
        
    except TimeoutException as e:
        error_msg = f"Timeout waiting for page to load: {str(e)}"
        if not silent_mode:
            print(error_msg)
        return {"error": error_msg}
    except Exception as e:
        error_msg = f"An error occurred: {str(e)}"
        if not silent_mode:
            print(error_msg)
        return {"error": error_msg}
    finally:
        if driver:
            try:
                driver.quit()
            except Exception as e:
                if not silent_mode:
                    print(f"Error closing driver: {e}")

def main():
    if len(sys.argv) > 1:
        url = sys.argv[1]
        albums = scrape_album_data(url, silent_mode=True)
        print(json.dumps(albums, ensure_ascii=False))
    else:
        url = "https://www.albumoftheyear.org/search/?q=time"
        print("Starting Album of the Year scraper...")
        albums = scrape_album_data(url, silent_mode=False)
        
        if isinstance(albums, dict) and 'error' in albums:
            print(f"Error: {albums['error']}")
            if 'debug_info' in albums:
                print(f"Debug info: {albums['debug_info']}")
        else:
            with open('albums_data.json', 'w', encoding='utf-8') as f:
                json.dump(albums, f, indent=2, ensure_ascii=False)
            print(f"Data saved to albums_data.json")

            if albums:
                print(f"\nSample of scraped data:")
                for i, album in enumerate(albums[:3]):
                    print(f"\nAlbum {i+1}:")
                    for key, value in album.items():
                        print(f"  {key}: {value}")

if __name__ == "__main__":
    main()