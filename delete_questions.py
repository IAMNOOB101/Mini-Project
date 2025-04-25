from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["mockmate"]

# Delete the questions collection
db.questions.drop()
print("Questions collection deleted successfully!") 