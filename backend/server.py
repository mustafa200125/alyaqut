from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
import random
import string
from emergentintegrations.llm.chat import LlmChat, UserMessage


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
JWT_SECRET = os.environ.get('JWT_SECRET_KEY')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRATION_HOURS = int(os.environ.get('JWT_EXPIRATION_HOURS', 720))

# LLM Client
EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")


# =============== Models ===============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    username: str
    bio: Optional[str] = ""
    avatar_url: Optional[str] = ""
    gender: Optional[str] = ""
    country: Optional[str] = ""
    city: Optional[str] = ""
    profession: Optional[str] = ""
    verified: bool = False
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    username: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class VerifyEmail(BaseModel):
    email: EmailStr
    code: str

class ResendCode(BaseModel):
    email: EmailStr

class Post(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    avatar_url: Optional[str] = ""
    content: str
    image_url: Optional[str] = None
    likes_count: int = 0
    comments_count: int = 0
    liked_by_current_user: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PostCreate(BaseModel):
    content: str
    image_url: Optional[str] = None

class Comment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    post_id: str
    user_id: str
    username: str
    avatar_url: Optional[str] = ""
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CommentCreate(BaseModel):
    content: str

class Message(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sender_id: str
    receiver_id: str
    sender_username: str
    receiver_username: str
    content: str
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MessageCreate(BaseModel):
    receiver_id: str
    content: str

class Story(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    username: str
    avatar_url: Optional[str] = ""
    image_url: Optional[str] = None
    video_url: Optional[str] = None
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StoryCreate(BaseModel):
    image_url: Optional[str] = None
    video_url: Optional[str] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class AIContentSuggestion(BaseModel):
    suggestions: List[str]


# =============== Helper Functions ===============

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    to_encode = {"user_id": user_id, "exp": expire}
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def generate_verification_code() -> str:
    return ''.join(random.choices(string.digits, k=6))

async def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


# =============== Auth Routes ===============

@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(status_code=400, detail="Username already taken")
    
    # Generate verification code
    code = generate_verification_code()
    
    # Create user
    user = User(
        email=user_data.email,
        username=user_data.username
    )
    
    user_dict = user.model_dump()
    user_dict['password_hash'] = hash_password(user_data.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Store verification code
    verification = {
        "email": user_data.email,
        "code": code,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    }
    await db.verification_codes.delete_many({"email": user_data.email})
    await db.verification_codes.insert_one(verification)
    
    return {"message": "Registration successful. Check your email for verification code.", "code": code}

@api_router.post("/auth/verify-email", response_model=TokenResponse)
async def verify_email(verify_data: VerifyEmail):
    # Check verification code
    verification = await db.verification_codes.find_one({"email": verify_data.email})
    if not verification:
        raise HTTPException(status_code=400, detail="Verification code not found")
    
    if verification['code'] != verify_data.code:
        raise HTTPException(status_code=400, detail="Invalid verification code")
    
    expires_at = datetime.fromisoformat(verification['expires_at'])
    if datetime.now(timezone.utc) > expires_at:
        raise HTTPException(status_code=400, detail="Verification code expired")
    
    # Update user as verified
    await db.users.update_one(
        {"email": verify_data.email},
        {"$set": {"verified": True}}
    )
    
    # Delete verification code
    await db.verification_codes.delete_many({"email": verify_data.email})
    
    # Get user
    user = await db.users.find_one({"email": verify_data.email}, {"_id": 0, "password_hash": 0})
    if user['created_at']:
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    # Generate token
    token = create_access_token(user['id'])
    
    return TokenResponse(access_token=token, user=User(**user))

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(login_data.password, user['password_hash']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get('verified', False):
        raise HTTPException(status_code=401, detail="Email not verified")
    
    # Generate token
    token = create_access_token(user['id'])
    
    # Prepare user data
    user_data = {k: v for k, v in user.items() if k not in ['_id', 'password_hash']}
    if user_data['created_at']:
        user_data['created_at'] = datetime.fromisoformat(user_data['created_at'])
    
    return TokenResponse(access_token=token, user=User(**user_data))

@api_router.post("/auth/resend-code")
async def resend_code(data: ResendCode):
    user = await db.users.find_one({"email": data.email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate new code
    code = generate_verification_code()
    
    verification = {
        "email": data.email,
        "code": code,
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    }
    await db.verification_codes.delete_many({"email": data.email})
    await db.verification_codes.insert_one(verification)
    
    return {"message": "Verification code sent", "code": code}

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    if current_user['created_at']:
        current_user['created_at'] = datetime.fromisoformat(current_user['created_at'])
    return User(**current_user)


# =============== Posts Routes ===============

@api_router.post("/posts", response_model=Post)
async def create_post(post_data: PostCreate, current_user: dict = Depends(get_current_user)):
    post = Post(
        user_id=current_user['id'],
        username=current_user['username'],
        avatar_url=current_user.get('avatar_url', ''),
        content=post_data.content,
        image_url=post_data.image_url
    )
    
    post_dict = post.model_dump()
    post_dict['created_at'] = post_dict['created_at'].isoformat()
    
    await db.posts.insert_one(post_dict)
    
    # Update user posts count
    await db.users.update_one(
        {"id": current_user['id']},
        {"$inc": {"posts_count": 1}}
    )
    
    return post

@api_router.get("/posts", response_model=List[Post])
async def get_posts(current_user: dict = Depends(get_current_user)):
    posts = await db.posts.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for post in posts:
        if post['created_at']:
            post['created_at'] = datetime.fromisoformat(post['created_at'])
        
        # Check if current user liked this post
        like = await db.likes.find_one({"user_id": current_user['id'], "post_id": post['id']})
        post['liked_by_current_user'] = like is not None
    
    return posts

@api_router.get("/posts/{post_id}", response_model=Post)
async def get_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post['created_at']:
        post['created_at'] = datetime.fromisoformat(post['created_at'])
    
    like = await db.likes.find_one({"user_id": current_user['id'], "post_id": post_id})
    post['liked_by_current_user'] = like is not None
    
    return Post(**post)

@api_router.delete("/posts/{post_id}")
async def delete_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if post['user_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.posts.delete_one({"id": post_id})
    await db.likes.delete_many({"post_id": post_id})
    await db.comments.delete_many({"post_id": post_id})
    
    # Update user posts count
    await db.users.update_one(
        {"id": current_user['id']},
        {"$inc": {"posts_count": -1}}
    )
    
    return {"message": "Post deleted"}

@api_router.post("/posts/{post_id}/like")
async def like_post(post_id: str, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    existing_like = await db.likes.find_one({"user_id": current_user['id'], "post_id": post_id})
    if existing_like:
        return {"message": "Already liked"}
    
    like = {
        "id": str(uuid.uuid4()),
        "user_id": current_user['id'],
        "post_id": post_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.likes.insert_one(like)
    
    await db.posts.update_one(
        {"id": post_id},
        {"$inc": {"likes_count": 1}}
    )
    
    return {"message": "Post liked"}

@api_router.delete("/posts/{post_id}/like")
async def unlike_post(post_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.likes.delete_one({"user_id": current_user['id'], "post_id": post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Like not found")
    
    await db.posts.update_one(
        {"id": post_id},
        {"$inc": {"likes_count": -1}}
    )
    
    return {"message": "Post unliked"}


# =============== Comments Routes ===============

@api_router.post("/posts/{post_id}/comments", response_model=Comment)
async def create_comment(post_id: str, comment_data: CommentCreate, current_user: dict = Depends(get_current_user)):
    post = await db.posts.find_one({"id": post_id})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment = Comment(
        post_id=post_id,
        user_id=current_user['id'],
        username=current_user['username'],
        avatar_url=current_user.get('avatar_url', ''),
        content=comment_data.content
    )
    
    comment_dict = comment.model_dump()
    comment_dict['created_at'] = comment_dict['created_at'].isoformat()
    
    await db.comments.insert_one(comment_dict)
    
    await db.posts.update_one(
        {"id": post_id},
        {"$inc": {"comments_count": 1}}
    )
    
    return comment

@api_router.get("/posts/{post_id}/comments", response_model=List[Comment])
async def get_comments(post_id: str):
    comments = await db.comments.find({"post_id": post_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    for comment in comments:
        if comment['created_at']:
            comment['created_at'] = datetime.fromisoformat(comment['created_at'])
    
    return comments

@api_router.delete("/comments/{comment_id}")
async def delete_comment(comment_id: str, current_user: dict = Depends(get_current_user)):
    comment = await db.comments.find_one({"id": comment_id})
    if not comment:
        raise HTTPException(status_code=404, detail="Comment not found")
    
    if comment['user_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.comments.delete_one({"id": comment_id})
    
    await db.posts.update_one(
        {"id": comment['post_id']},
        {"$inc": {"comments_count": -1}}
    )
    
    return {"message": "Comment deleted"}


# =============== Follow Routes ===============

@api_router.post("/users/{user_id}/follow")
async def follow_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    existing_follow = await db.follows.find_one({
        "follower_id": current_user['id'],
        "following_id": user_id
    })
    if existing_follow:
        return {"message": "Already following"}
    
    follow = {
        "id": str(uuid.uuid4()),
        "follower_id": current_user['id'],
        "following_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.follows.insert_one(follow)
    
    await db.users.update_one({"id": user_id}, {"$inc": {"followers_count": 1}})
    await db.users.update_one({"id": current_user['id']}, {"$inc": {"following_count": 1}})
    
    return {"message": "User followed"}

@api_router.delete("/users/{user_id}/follow")
async def unfollow_user(user_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.follows.delete_one({
        "follower_id": current_user['id'],
        "following_id": user_id
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Follow not found")
    
    await db.users.update_one({"id": user_id}, {"$inc": {"followers_count": -1}})
    await db.users.update_one({"id": current_user['id']}, {"$inc": {"following_count": -1}})
    
    return {"message": "User unfollowed"}

@api_router.get("/users/{user_id}/followers", response_model=List[User])
async def get_followers(user_id: str):
    follows = await db.follows.find({"following_id": user_id}, {"_id": 0}).to_list(1000)
    follower_ids = [f['follower_id'] for f in follows]
    
    users = await db.users.find(
        {"id": {"$in": follower_ids}},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    for user in users:
        if user['created_at']:
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return users

@api_router.get("/users/{user_id}/following", response_model=List[User])
async def get_following(user_id: str):
    follows = await db.follows.find({"follower_id": user_id}, {"_id": 0}).to_list(1000)
    following_ids = [f['following_id'] for f in follows]
    
    users = await db.users.find(
        {"id": {"$in": following_ids}},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    for user in users:
        if user['created_at']:
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return users

@api_router.get("/users/{user_id}/is-following")
async def is_following(user_id: str, current_user: dict = Depends(get_current_user)):
    follow = await db.follows.find_one({
        "follower_id": current_user['id'],
        "following_id": user_id
    })
    return {"is_following": follow is not None}


# =============== Friendship Routes ===============

@api_router.post("/users/{user_id}/friend-request")
async def send_friend_request(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot send friend request to yourself")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already friends
    existing_friendship = await db.friendships.find_one({
        "$or": [
            {"user_id": current_user['id'], "friend_id": user_id, "status": "accepted"},
            {"user_id": user_id, "friend_id": current_user['id'], "status": "accepted"}
        ]
    })
    if existing_friendship:
        return {"message": "Already friends"}
    
    # Check if request already sent
    existing_request = await db.friendships.find_one({
        "user_id": current_user['id'],
        "friend_id": user_id,
        "status": "pending"
    })
    if existing_request:
        return {"message": "Friend request already sent"}
    
    # Create friend request
    friendship = {
        "id": str(uuid.uuid4()),
        "user_id": current_user['id'],
        "friend_id": user_id,
        "status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.friendships.insert_one(friendship)
    
    return {"message": "Friend request sent"}

@api_router.post("/users/{user_id}/accept-friend")
async def accept_friend_request(user_id: str, current_user: dict = Depends(get_current_user)):
    friendship = await db.friendships.find_one({
        "user_id": user_id,
        "friend_id": current_user['id'],
        "status": "pending"
    })
    
    if not friendship:
        raise HTTPException(status_code=404, detail="Friend request not found")
    
    await db.friendships.update_one(
        {"id": friendship['id']},
        {"$set": {"status": "accepted"}}
    )
    
    return {"message": "Friend request accepted"}

@api_router.delete("/users/{user_id}/friend")
async def remove_friend(user_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.friendships.delete_one({
        "$or": [
            {"user_id": current_user['id'], "friend_id": user_id},
            {"user_id": user_id, "friend_id": current_user['id']}
        ]
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Friendship not found")
    
    return {"message": "Friend removed"}

@api_router.get("/users/{user_id}/friendship-status")
async def get_friendship_status(user_id: str, current_user: dict = Depends(get_current_user)):
    # Check if friends
    friendship = await db.friendships.find_one({
        "$or": [
            {"user_id": current_user['id'], "friend_id": user_id, "status": "accepted"},
            {"user_id": user_id, "friend_id": current_user['id'], "status": "accepted"}
        ]
    })
    if friendship:
        return {"status": "friends"}
    
    # Check if pending request sent by current user
    pending_sent = await db.friendships.find_one({
        "user_id": current_user['id'],
        "friend_id": user_id,
        "status": "pending"
    })
    if pending_sent:
        return {"status": "pending_sent"}
    
    # Check if pending request received
    pending_received = await db.friendships.find_one({
        "user_id": user_id,
        "friend_id": current_user['id'],
        "status": "pending"
    })
    if pending_received:
        return {"status": "pending_received"}
    
    return {"status": "none"}

@api_router.get("/users/friends")
async def get_friends(current_user: dict = Depends(get_current_user)):
    friendships = await db.friendships.find({
        "$or": [
            {"user_id": current_user['id'], "status": "accepted"},
            {"friend_id": current_user['id'], "status": "accepted"}
        ]
    }, {"_id": 0}).to_list(1000)
    
    friend_ids = []
    for friendship in friendships:
        if friendship['user_id'] == current_user['id']:
            friend_ids.append(friendship['friend_id'])
        else:
            friend_ids.append(friendship['user_id'])
    
    users = await db.users.find(
        {"id": {"$in": friend_ids}},
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    
    for user in users:
        if user['created_at']:
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return users


# =============== Block Routes ===============

@api_router.post("/users/{user_id}/block")
async def block_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if user_id == current_user['id']:
        raise HTTPException(status_code=400, detail="Cannot block yourself")
    
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check if already blocked
    existing_block = await db.blocks.find_one({
        "blocker_id": current_user['id'],
        "blocked_id": user_id
    })
    if existing_block:
        return {"message": "Already blocked"}
    
    # Create block
    block = {
        "id": str(uuid.uuid4()),
        "blocker_id": current_user['id'],
        "blocked_id": user_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.blocks.insert_one(block)
    
    # Remove friendship if exists
    await db.friendships.delete_many({
        "$or": [
            {"user_id": current_user['id'], "friend_id": user_id},
            {"user_id": user_id, "friend_id": current_user['id']}
        ]
    })
    
    # Remove follow if exists
    await db.follows.delete_many({
        "$or": [
            {"follower_id": current_user['id'], "following_id": user_id},
            {"follower_id": user_id, "following_id": current_user['id']}
        ]
    })
    
    return {"message": "User blocked"}

@api_router.delete("/users/{user_id}/block")
async def unblock_user(user_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.blocks.delete_one({
        "blocker_id": current_user['id'],
        "blocked_id": user_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Block not found")
    
    return {"message": "User unblocked"}

@api_router.get("/users/{user_id}/is-blocked")
async def is_blocked(user_id: str, current_user: dict = Depends(get_current_user)):
    # Check if current user blocked the target user
    blocked_by_me = await db.blocks.find_one({
        "blocker_id": current_user['id'],
        "blocked_id": user_id
    })
    
    # Check if current user is blocked by target user
    blocked_me = await db.blocks.find_one({
        "blocker_id": user_id,
        "blocked_id": current_user['id']
    })
    
    return {
        "blocked_by_me": blocked_by_me is not None,
        "blocked_me": blocked_me is not None
    }


# =============== Messages Routes ===============

@api_router.post("/messages", response_model=Message)
async def send_message(message_data: MessageCreate, current_user: dict = Depends(get_current_user)):
    receiver = await db.users.find_one({"id": message_data.receiver_id})
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")
    
    message = Message(
        sender_id=current_user['id'],
        receiver_id=message_data.receiver_id,
        sender_username=current_user['username'],
        receiver_username=receiver['username'],
        content=message_data.content
    )
    
    message_dict = message.model_dump()
    message_dict['created_at'] = message_dict['created_at'].isoformat()
    
    await db.messages.insert_one(message_dict)
    
    return message

@api_router.get("/messages/conversations")
async def get_conversations(current_user: dict = Depends(get_current_user)):
    # Get all messages where user is sender or receiver
    messages = await db.messages.find({
        "$or": [
            {"sender_id": current_user['id']},
            {"receiver_id": current_user['id']}
        ]
    }, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Group by conversation partner
    conversations = {}
    for msg in messages:
        partner_id = msg['receiver_id'] if msg['sender_id'] == current_user['id'] else msg['sender_id']
        if partner_id not in conversations:
            conversations[partner_id] = msg
    
    result = []
    for partner_id, last_msg in conversations.items():
        partner = await db.users.find_one({"id": partner_id}, {"_id": 0, "password_hash": 0})
        if partner:
            unread_count = await db.messages.count_documents({
                "sender_id": partner_id,
                "receiver_id": current_user['id'],
                "read": False
            })
            result.append({
                "partner": partner,
                "last_message": last_msg,
                "unread_count": unread_count
            })
    
    return result

@api_router.get("/messages/{user_id}", response_model=List[Message])
async def get_messages_with_user(user_id: str, current_user: dict = Depends(get_current_user)):
    messages = await db.messages.find({
        "$or": [
            {"sender_id": current_user['id'], "receiver_id": user_id},
            {"sender_id": user_id, "receiver_id": current_user['id']}
        ]
    }, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    for msg in messages:
        if msg['created_at']:
            msg['created_at'] = datetime.fromisoformat(msg['created_at'])
    
    # Mark messages as read
    await db.messages.update_many(
        {"sender_id": user_id, "receiver_id": current_user['id'], "read": False},
        {"$set": {"read": True}}
    )
    
    return messages


# =============== Stories Routes ===============

@api_router.post("/stories", response_model=Story)
async def create_story(story_data: StoryCreate, current_user: dict = Depends(get_current_user)):
    expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
    
    story = Story(
        user_id=current_user['id'],
        username=current_user['username'],
        avatar_url=current_user.get('avatar_url', ''),
        image_url=story_data.image_url,
        video_url=story_data.video_url,
        expires_at=expires_at
    )
    
    story_dict = story.model_dump()
    story_dict['created_at'] = story_dict['created_at'].isoformat()
    story_dict['expires_at'] = story_dict['expires_at'].isoformat()
    
    await db.stories.insert_one(story_dict)
    
    return story

@api_router.get("/stories", response_model=List[Story])
async def get_stories():
    # Delete expired stories
    await db.stories.delete_many({
        "expires_at": {"$lt": datetime.now(timezone.utc).isoformat()}
    })
    
    stories = await db.stories.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for story in stories:
        if story['created_at']:
            story['created_at'] = datetime.fromisoformat(story['created_at'])
        if story['expires_at']:
            story['expires_at'] = datetime.fromisoformat(story['expires_at'])
    
    return stories

@api_router.delete("/stories/{story_id}")
async def delete_story(story_id: str, current_user: dict = Depends(get_current_user)):
    story = await db.stories.find_one({"id": story_id})
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    
    if story['user_id'] != current_user['id']:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    await db.stories.delete_one({"id": story_id})
    
    return {"message": "Story deleted"}


# =============== AI Features Routes ===============

@api_router.post("/ai/content-suggestions", response_model=AIContentSuggestion)
async def get_content_suggestions(current_user: dict = Depends(get_current_user)):
    # Get user's recent posts to understand their style
    user_posts = await db.posts.find(
        {"user_id": current_user['id']},
        {"_id": 0, "content": 1}
    ).sort("created_at", -1).limit(5).to_list(5)
    
    posts_context = " ".join([p.get('content', '') for p in user_posts]) if user_posts else "general topics"
    
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"content_suggestions_{current_user['id']}",
            system_message="You are a creative social media content assistant. Generate engaging post ideas."
        ).with_model("openai", "gpt-4o-mini")
        
        message = UserMessage(
            text=f"Based on this user's previous posts: '{posts_context[:200]}', suggest 3 creative and engaging post ideas for their social media. Keep each suggestion under 100 characters. Return only the suggestions, numbered 1-3."
        )
        
        response = await chat.send_message(message)
        suggestions = [s.strip() for s in response.split('\n') if s.strip() and any(char.isdigit() for char in s[:3])]
        suggestions = [s.split('.', 1)[-1].strip() if '.' in s[:3] else s for s in suggestions]
        
        return AIContentSuggestion(suggestions=suggestions[:3])
    except Exception as e:
        logging.error(f"AI suggestion error: {e}")
        return AIContentSuggestion(suggestions=[
            "شارك لحظة مميزة من يومك",
            "ما هو الشيء الذي يلهمك اليوم؟",
            "شارك نصيحة مفيدة مع متابعيك"
        ])

@api_router.post("/ai/moderate-content")
async def moderate_content(content: dict):
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id="content_moderation",
            system_message="You are a content moderator. Analyze if content is appropriate."
        ).with_model("openai", "gpt-4o-mini")
        
        message = UserMessage(
            text=f"Is this content appropriate for a social network? Reply with only 'YES' or 'NO': {content.get('text', '')}"
        )
        
        response = await chat.send_message(message)
        is_appropriate = "YES" in response.upper()
        
        return {"appropriate": is_appropriate, "reason": response if not is_appropriate else ""}
    except Exception as e:
        logging.error(f"Content moderation error: {e}")
        return {"appropriate": True, "reason": ""}

@api_router.post("/ai/generate-hashtags")
async def generate_hashtags(content: dict):
    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id="hashtag_generation",
            system_message="You are a hashtag generator. Create relevant hashtags."
        ).with_model("openai", "gpt-4o-mini")
        
        message = UserMessage(
            text=f"Generate 5 relevant hashtags for this post (return only hashtags with #): {content.get('text', '')}"
        )
        
        response = await chat.send_message(message)
        hashtags = [tag.strip() for tag in response.split() if tag.startswith('#')]
        
        return {"hashtags": hashtags[:5]}
    except Exception as e:
        logging.error(f"Hashtag generation error: {e}")
        return {"hashtags": ["#الياقوت", "#تواصل", "#اجتماعي"]}

@api_router.get("/users/suggestions", response_model=List[User])
async def get_user_suggestions(current_user: dict = Depends(get_current_user)):
    # Get users the current user is NOT following
    following = await db.follows.find({"follower_id": current_user['id']}, {"_id": 0}).to_list(1000)
    following_ids = [f['following_id'] for f in following]
    following_ids.append(current_user['id'])  # Exclude self
    
    # Get random users
    users = await db.users.find(
        {"id": {"$nin": following_ids}, "verified": True},
        {"_id": 0, "password_hash": 0}
    ).limit(5).to_list(5)
    
    for user in users:
        if user['created_at']:
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return users


# =============== User Profile Routes ===============

@api_router.get("/users/{user_id}", response_model=User)
async def get_user_profile(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user['created_at']:
        user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return User(**user)

@api_router.get("/users/{user_id}/posts", response_model=List[Post])
async def get_user_posts(user_id: str, current_user: dict = Depends(get_current_user)):
    posts = await db.posts.find({"user_id": user_id}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    for post in posts:
        if post['created_at']:
            post['created_at'] = datetime.fromisoformat(post['created_at'])
        
        like = await db.likes.find_one({"user_id": current_user['id'], "post_id": post['id']})
        post['liked_by_current_user'] = like is not None
    
    return posts

@api_router.put("/users/profile")
async def update_profile(profile_data: dict, current_user: dict = Depends(get_current_user)):
    update_fields = {}
    if 'username' in profile_data:
        # Check if username is taken
        existing = await db.users.find_one({"username": profile_data['username'], "id": {"$ne": current_user['id']}})
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")
        update_fields['username'] = profile_data['username']
    
    if 'bio' in profile_data:
        update_fields['bio'] = profile_data['bio']
    
    if 'avatar_url' in profile_data:
        update_fields['avatar_url'] = profile_data['avatar_url']
    
    if 'gender' in profile_data:
        update_fields['gender'] = profile_data['gender']
    
    if 'country' in profile_data:
        update_fields['country'] = profile_data['country']
    
    if 'city' in profile_data:
        update_fields['city'] = profile_data['city']
    
    if 'profession' in profile_data:
        update_fields['profession'] = profile_data['profession']
    
    if update_fields:
        await db.users.update_one(
            {"id": current_user['id']},
            {"$set": update_fields}
        )
    
    return {"message": "Profile updated"}


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()