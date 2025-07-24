import requests
import json
import sys
import io
from bs4 import BeautifulSoup
import time

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

def scrape_album_data_requests(url, silent_mode=False):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
    }
    
    try:
        if not silent_mode:
            print(f"Fetching page: {url}")
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Find album blocks
        album_blocks = soup.find_all(class_='albumBlock')
        
        if not silent_mode:
            print(f"Found {len(album_blocks)} album blocks")
        
        if len(album_blocks) == 0:
            return {"error": "No album blocks found", "debug_info": {
                "page_title": soup.title.string if soup.title else "No title",
                "response_status": response.status_code
            }}
        
        albums_data = []
        
        for i, block in enumerate(album_blocks):
            try:
                album_info = {}
                
                album_info['image_url'] = None
                try:
                    image_div = block.find('div', class_='image')
                    if image_div:
                        img_element = image_div.find('img')
                        if img_element:
                            album_info['image_url'] = img_element.get('data-src') or img_element.get('src')
                    
                    if not album_info['image_url']:
                        img_element = block.find('img')
                        if img_element:
                            album_info['image_url'] = img_element.get('data-src') or img_element.get('src')
                except:
                    pass

                album_info['artist_name'] = None
                try:
                    artist_element = block.find(class_='artistTitle')
                    if artist_element:
                        album_info['artist_name'] = artist_element.get_text(strip=True)
                except:
                    pass
                
                album_info['album_name'] = None
                try:
                    album_element = block.find(class_='albumTitle')
                    if album_element:
                        album_info['album_name'] = album_element.get_text(strip=True)
                except:
                    pass
                
                album_info['release_date'] = None
                album_info['record_type'] = None
                try:
                    type_element = block.find(class_='type')
                    if type_element:
                        type_text = type_element.get_text(strip=True)
                        
                        if '•' in type_text:
                            parts = type_text.split('•')
                            if len(parts) >= 2:
                                album_info['release_date'] = parts[0].strip()
                                album_info['record_type'] = parts[1].strip()
                            else:
                                album_info['record_type'] = type_text
                        else:
                            album_info['record_type'] = type_text
                except:
                    pass
                
                album_info['album_url'] = None
                try:
                    album_link = block.find(class_='albumTitle')
                    if album_link:
                        link_tag = album_link.find('a')
                        if not link_tag:
                            link_tag = album_link.find_parent('a')
                        
                        if link_tag:
                            album_info['album_url'] = link_tag.get('href')
                except:
                    pass
                
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
        
    except requests.RequestException as e:
        error_msg = f"Request error: {str(e)}"
        if not silent_mode:
            print(error_msg)
        return {"error": error_msg}
    except Exception as e:
        error_msg = f"An error occurred: {str(e)}"
        if not silent_mode:
            print(error_msg)
        return {"error": error_msg}

def main():
    if len(sys.argv) > 1:
        url = sys.argv[1]
        albums = scrape_album_data_requests(url, silent_mode=True)
        try:
            print(json.dumps(albums, ensure_ascii=False))
        except UnicodeEncodeError:
            print(json.dumps(albums, ensure_ascii=True))
    else:
        url = "https://www.albumoftheyear.org/search/?q=time"
        print("Starting Album of the Year scraper (requests version)...")
        albums = scrape_album_data_requests(url, silent_mode=False)
        
        if isinstance(albums, dict) and 'error' in albums:
            print(f"Error: {albums['error']}")
        else:
            try:
                with open('albums_data.json', 'w', encoding='utf-8') as f:
                    json.dump(albums, f, indent=2, ensure_ascii=False)
                print(f"Data saved to albums_data.json")
            except UnicodeEncodeError:
                with open('albums_data.json', 'w', encoding='utf-8') as f:
                    json.dump(albums, f, indent=2, ensure_ascii=True)
                print(f"Data saved to albums_data.json (ASCII fallback)")

if __name__ == "__main__":
    main()