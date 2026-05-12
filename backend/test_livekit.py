import os
import asyncio
from livekit import api
from dotenv import load_dotenv

async def test_keys():
    load_dotenv()
    url = os.getenv('LIVEKIT_URL')
    key = os.getenv('LIVEKIT_API_KEY')
    secret = os.getenv('LIVEKIT_API_SECRET')
    
    print(f"Testing URL: {url}")
    print(f"Testing Key: {key}")
    
    lkapi = api.LiveKitAPI(url, key, secret)
    try:
        rooms = await lkapi.room.list_rooms(api.ListRoomsRequest())
        print(f"✅ Success! Connected to LiveKit. Found {len(rooms.rooms)} rooms.")
    except Exception as e:
        print(f"❌ Failed to connect: {e}")
    finally:
        await lkapi.aclose()

if __name__ == "__main__":
    asyncio.run(test_keys())
