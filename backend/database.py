from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "polythink_studio")

client = MongoClient(MONGODB_URL)
db = client[DB_NAME]
users_collection = db["users"]
user_datasets_collection = db["user_datasets"]
pull_requests_collection = db["pull_requests"]
