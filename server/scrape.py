import json
import re
import sys
import io
import os
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
    chrome_options.add_argument('--headless')  
    chrome_options.add_argument('--no-sandbox')
    chrome_options.add_argument('--disable-dev-shm-usage')
    chrome_options.add_argument('--disable-gpu')  
    chrome_options.add_argument('--disable-extensions')
    chrome_options.add_argument('--disable-plugins')
    chrome_options.add_argument('--disable-images')  
    chrome_options.add_argument('--ignore-certificate-errors')  
    chrome_options.add_argument('--ignore-ssl-errors')
    chrome_options.add_argument('--ignore-certificate-errors-spki-list')
    chrome_options.add_argument('--disable-web-security')
    chrome_options.add_argument('--allow-running-insecure-content')
    chrome_options.add_argument('--disable-software-rasterizer')
    chrome_options.add_argument('--disable-background-timer-throttling')
    chrome_options.add_argument('--disable-backgrounding-occluded-windows')
    chrome_options.add_argument('--disable-renderer-backgrounding')
    chrome_options.add_argument('--disable-features=TranslateUI')
    chrome_options.add_argument('--disable-ipc-flooding-protection')
    chrome_options.add_argument('--remote-debugging-port=9222')
    chrome_options.add_argument('--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    
    # Docker compatibility: Use Chromium if available (Alpine Linux)
    if os.path.exists('/usr/bin/chromium-browser'):
        chrome_options.binary_location = '/usr/bin/chromium-browser'
        if not silent_mode:
            print("Using Chromium browser (Docker environment detected)")

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
        
        driver = None
        for path in possible_paths:
            if os.path.exists(path):
                try:
                    service = Service(path)
                    driver = webdriver.Chrome(service=service, options=chrome_options)
                    if not silent_mode:
                        print(f"Using ChromeDriver from: {path}")
                    break
                except Exception:
                    continue
        
        if driver is None:
            raise Exception("ChromeDriver not found. Please install ChromeDriver and add it to your PATH, or ensure Docker environment is properly configured.")
    
    try:
        if not silent_mode:
            print(f"Loading page: {url}")
        driver.get(url)
        
        wait = WebDriverWait(driver, 10)
        wait.until(EC.presence_of_element_located((By.CLASS_NAME, "albumBlock")))
        
        if not silent_mode:
            print("Scrolling to load all content...")
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        
        import time
        time.sleep(2)
        
        try:
            view_more_button = driver.find_element(By.CSS_SELECTOR, ".largeButtonContainer .largeButton")
            if view_more_button.is_displayed() and not silent_mode:
                print("Found 'View More' button - note: this links to a different page")
                print("Current script will only get albums from this page")
        except NoSuchElementException:
            pass
        
        album_blocks = driver.find_elements(By.CLASS_NAME, "albumBlock")
        if not silent_mode:
            print(f"Found {len(album_blocks)} album blocks")
        
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
        
    except TimeoutException:
        if not silent_mode:
            print("Timeout waiting for page to load")
        return []
    except Exception as e:
        if not silent_mode:
            print(f"An error occurred: {str(e)}")
        return []
    finally:
        driver.quit()

def main():
    if len(sys.argv) > 1:
        url = sys.argv[1]
        albums = scrape_album_data(url, silent_mode=True)
        print(json.dumps(albums, ensure_ascii=False))
    else:
        url = "https://www.albumoftheyear.org/search/?q=time"
        print("Starting Album of the Year scraper...")
        albums = scrape_album_data(url, silent_mode=False)
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