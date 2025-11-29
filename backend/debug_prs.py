from database import pull_requests_collection
from datetime import datetime, timedelta

print("--- PR Data Debug ---")
count = pull_requests_collection.count_documents({})
print(f"Total PRs: {count}")

cursor = pull_requests_collection.find()
for pr in cursor:
    print(f"ID: {pr['_id']}")
    print(f"User: {pr.get('username')}")
    print(f"Status: {pr.get('status')}")
    created_at = pr.get('created_at')
    print(f"Created At: {created_at} (Type: {type(created_at)})")
    
    # Check if it falls in the last 31 days
    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=31)
    
    if isinstance(created_at, datetime):
        is_in_range = start_date <= created_at <= end_date
        print(f"In Range ({start_date} - {end_date}): {is_in_range}")
    else:
        print("Created At is NOT a datetime object!")
        
    print("-" * 20)
