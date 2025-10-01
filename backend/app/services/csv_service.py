import pandas as pd
import os
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid
from app.core.config import settings

class CSVService:
    def __init__(self):
        self.todos_file = settings.TODOS_CSV
        self.users_file = settings.USERS_CSV
        self.categories_file = settings.CATEGORIES_CSV
        self._initialize_files()

    def _initialize_files(self):
        """Initialize CSV files with headers if they don't exist."""
        # Initialize todos.csv
        if not os.path.exists(self.todos_file):
            todos_df = pd.DataFrame(columns=[
                'id', 'user_id', 'title', 'description', 'priority', 
                'due_date', 'completed', 'created_at', 'updated_at', 'category'
            ])
            todos_df.to_csv(self.todos_file, index=False)

        # Initialize users.csv
        if not os.path.exists(self.users_file):
            users_df = pd.DataFrame(columns=[
                'id', 'username', 'email', 'password_hash', 
                'created_at', 'last_login', 'preferences'
            ])
            users_df.to_csv(self.users_file, index=False)

        # Initialize categories.csv
        if not os.path.exists(self.categories_file):
            categories_df = pd.DataFrame(columns=[
                'id', 'name', 'description', 'color', 'user_id'
            ])
            categories_df.to_csv(self.categories_file, index=False)

    def _get_next_id(self, df: pd.DataFrame) -> int:
        """Get the next available ID for a DataFrame."""
        if df.empty:
            return 1
        return int(df['id'].max()) + 1

    def _generate_uuid(self) -> str:
        """Generate a unique UUID string."""
        return str(uuid.uuid4())

    def _normalize_todo_record(self, record: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize a todo record read from CSV so API consumers get proper types.

        - Convert pandas NaN to None for nullable fields like due_date/description
        - Ensure booleans are real bools (not strings)
        - Ensure id is int
        - Ensure priority/category/title are strings
        - Preserve timestamps as ISO strings
        """
        def is_nan(value: Any) -> bool:
            try:
                # pandas uses float('nan') for empty cells
                return pd.isna(value)
            except Exception:
                return False

        normalized: Dict[str, Any] = dict(record)

        # id
        if "id" in normalized and not pd.isna(normalized["id"]):
            try:
                normalized["id"] = int(normalized["id"])
            except Exception:
                pass

        # nullable text fields
        for key in ["description", "due_date"]:
            if key in normalized and is_nan(normalized[key]):
                normalized[key] = None

        # completed -> bool
        if "completed" in normalized:
            val = normalized["completed"]
            if isinstance(val, str):
                normalized["completed"] = val.lower() == "true"
            elif isinstance(val, (int, float)):
                normalized["completed"] = bool(val)

        # Coerce strings
        for key in ["title", "priority", "category", "user_id", "created_at", "updated_at"]:
            if key in normalized and is_nan(normalized[key]):
                normalized[key] = None
            elif key in normalized and normalized[key] is not None:
                normalized[key] = str(normalized[key])

        return normalized

    # User operations
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user."""
        df = pd.read_csv(self.users_file)
        
        # Check if username or email already exists
        if not df.empty:
            if user_data['username'] in df['username'].values:
                raise ValueError("Username already exists")
            if user_data['email'] in df['email'].values:
                raise ValueError("Email already exists")
        
        user_data['id'] = self._generate_uuid()
        user_data['created_at'] = datetime.utcnow().isoformat()
        user_data['last_login'] = None
        user_data['preferences'] = '{}'
        
        new_user = pd.DataFrame([user_data])
        df = pd.concat([df, new_user], ignore_index=True)
        df.to_csv(self.users_file, index=False)
        
        return user_data

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username."""
        df = pd.read_csv(self.users_file)
        user = df[df['username'] == username]
        if user.empty:
            return None
        return user.iloc[0].to_dict()

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        df = pd.read_csv(self.users_file)
        user = df[df['id'] == user_id]
        if user.empty:
            return None
        return user.iloc[0].to_dict()

    def update_user(self, user_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update user data."""
        df = pd.read_csv(self.users_file)
        user_index = df[df['id'] == user_id].index
        
        if user_index.empty:
            return None
        
        for key, value in update_data.items():
            if key in df.columns:
                df.at[user_index[0], key] = value
        
        df.at[user_index[0], 'updated_at'] = datetime.utcnow().isoformat()
        df.to_csv(self.users_file, index=False)
        
        return df.iloc[user_index[0]].to_dict()

    # Todo operations
    def create_todo(self, todo_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new todo."""
        df = pd.read_csv(self.todos_file)
        # Ensure category exists for this user (auto-manage categories on-the-fly)
        if todo_data.get("category"):
            self._ensure_category_exists(todo_data["user_id"], todo_data["category"])
        
        todo_data['id'] = self._get_next_id(df)
        todo_data['completed'] = False
        todo_data['created_at'] = datetime.utcnow().isoformat()
        todo_data['updated_at'] = datetime.utcnow().isoformat()
        
        new_todo = pd.DataFrame([todo_data])
        df = pd.concat([df, new_todo], ignore_index=True)
        df.to_csv(self.todos_file, index=False)
        
        return todo_data

    def _ensure_category_exists(self, user_id: str, category_name: str) -> None:
        """Create a category for the user if it doesn't already exist."""
        cdf = pd.read_csv(self.categories_file)
        if not cdf.empty:
            existing = cdf[(cdf['user_id'] == user_id) & (cdf['name'] == category_name)]
            if not existing.empty:
                return
        # Create a simple category with defaults
        category_row = pd.DataFrame([{
            'id': self._generate_uuid(),
            'name': category_name,
            'description': '',
            'color': '#3B82F6',
            'user_id': user_id,
        }])
        cdf = pd.concat([cdf, category_row], ignore_index=True)
        cdf.to_csv(self.categories_file, index=False)

    def get_todos_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all todos for a user."""
        df = pd.read_csv(self.todos_file)
        if df.empty:
            return []
        user_todos = df[df['user_id'] == user_id]
        records = user_todos.to_dict('records')
        return [self._normalize_todo_record(r) for r in records]

    def get_todo_by_id(self, todo_id: int, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific todo by ID."""
        df = pd.read_csv(self.todos_file)
        todo = df[(df['id'] == todo_id) & (df['user_id'] == user_id)]
        if todo.empty:
            return None
        return self._normalize_todo_record(todo.iloc[0].to_dict())

    def update_todo(self, todo_id: int, user_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a todo."""
        df = pd.read_csv(self.todos_file)
        todo_index = df[(df['id'] == todo_id) & (df['user_id'] == user_id)].index
        
        if todo_index.empty:
            return None
        
        for key, value in update_data.items():
            if key in df.columns and key not in ['id', 'user_id', 'created_at']:
                df.at[todo_index[0], key] = value
        
        df.at[todo_index[0], 'updated_at'] = datetime.utcnow().isoformat()
        df.to_csv(self.todos_file, index=False)
        
        return self._normalize_todo_record(df.iloc[todo_index[0]].to_dict())

    def delete_todo(self, todo_id: int, user_id: str) -> bool:
        """Delete a todo."""
        df = pd.read_csv(self.todos_file)
        todo_index = df[(df['id'] == todo_id) & (df['user_id'] == user_id)].index
        
        if todo_index.empty:
            return False
        
        df = df.drop(todo_index)
        df.to_csv(self.todos_file, index=False)
        return True

    # Category operations
    def create_category(self, category_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new category."""
        df = pd.read_csv(self.categories_file)
        
        # Check if category name already exists for this user
        if not df.empty:
            existing = df[(df['name'] == category_data['name']) & (df['user_id'] == category_data['user_id'])]
            if not existing.empty:
                raise ValueError("Category name already exists for this user")
        
        category_data['id'] = self._generate_uuid()
        
        new_category = pd.DataFrame([category_data])
        df = pd.concat([df, new_category], ignore_index=True)
        df.to_csv(self.categories_file, index=False)
        
        return category_data

    def get_categories_by_user(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all categories for a user."""
        df = pd.read_csv(self.categories_file)
        user_categories = df[df['user_id'] == user_id]
        
        # Normalize the data to handle NaN values
        categories = []
        for _, row in user_categories.iterrows():
            category_dict = row.to_dict()
            # Replace NaN values with None for JSON serialization
            for key, value in category_dict.items():
                if pd.isna(value):
                    category_dict[key] = None
            categories.append(category_dict)
        
        return categories

    def update_category(self, category_id: str, user_id: str, update_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Update a category."""
        df = pd.read_csv(self.categories_file)
        category_index = df[(df['id'] == category_id) & (df['user_id'] == user_id)].index
        
        if category_index.empty:
            return None
        
        for key, value in update_data.items():
            if key in df.columns and key not in ['id', 'user_id']:
                df.at[category_index[0], key] = value
        
        df.to_csv(self.categories_file, index=False)
        return df.iloc[category_index[0]].to_dict()

    def delete_category(self, category_id: str, user_id: str) -> bool:
        """Delete a category."""
        df = pd.read_csv(self.categories_file)
        category_index = df[(df['id'] == category_id) & (df['user_id'] == user_id)].index
        
        if category_index.empty:
            return False
        
        df = df.drop(category_index)
        df.to_csv(self.categories_file, index=False)
        return True
