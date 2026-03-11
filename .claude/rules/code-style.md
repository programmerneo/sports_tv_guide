# Python Style Guide

This document defines coding standards and best practices for Python web application development. All developers and AI assistants working on this codebase must follow these guidelines.

## General Principles

### Follow Existing Patterns First

**Always prioritize following existing coding patterns found in the codebase, while also adhering to industry standards.**

**Guidelines:**

1. **Consistency Over Novelty**: If a pattern exists in the codebase, use it. However, if you know a better industry standard way, ask first before implementing
2. **Explore Before Implementing**: Before writing new code, search for similar existing implementations to follow
3. **Industry Standards**: When no existing pattern exists, follow Python industry best practices
4. **Pattern Evolution**: If you identify a problematic pattern, discuss with the team before changing it across the codebase

**Why This Matters:**

- **Maintainability**: Consistent patterns make the codebase easier to understand and maintain
- **Onboarding**: New developers can learn patterns once and apply them everywhere
- **Debugging**: Similar code behaves similarly, making issues easier to diagnose
- **Code Review**: Reviewers can focus on logic rather than style differences

**Balance:**

While following existing patterns is important, don't blindly copy anti-patterns or bugs. Use judgment:
- Follow patterns for structure and style
- Apply industry standards for correctness and security
- Raise questions when existing patterns seem problematic

### Keep Changes Minimal and Focused

**Make code changes as short and simple as possible while maintaining readability. Do not refactor code unless explicitly asked.**

**Guidelines:**

1. **Minimal Scope**: Only change what's necessary to accomplish the specific task
2. **No Drive-By Refactoring**: Don't "improve" or "clean up" unrelated code while making changes
3. **Surgical Edits**: Make targeted changes rather than rewriting entire functions or files
4. **Ask Before Refactoring**: If refactoring would genuinely help, ask first - don't assume it's wanted

**Why This Matters:**

- **Review Efficiency**: Smaller diffs are easier and faster to review
- **Risk Reduction**: Less code changed = less chance of introducing bugs
- **Clear Intent**: Focused changes make the purpose obvious
- **Easier Rollback**: If something breaks, minimal changes are easier to revert
- **Merge Conflicts**: Smaller changes reduce likelihood of conflicts

**Refactoring Requests:**

If you believe refactoring would genuinely improve the code:

1. Complete the requested task first with minimal changes
2. Ask the user: "I noticed [specific issue]. Would you like me to refactor [specific area] to [specific benefit]?"
3. Wait for explicit approval before refactoring

**Remember:** The best code change is often the smallest one that solves the problem.

---

## Table of Contents

1. [General Principles](#general-principles)
2. [Code Formatting](#code-formatting)
3. [Naming Conventions](#naming-conventions)
4. [Imports](#imports)
5. [Type Hints](#type-hints)
6. [Docstrings](#docstrings)
7. [Functions and Methods](#functions-and-methods)
8. [Python Style & Patterns](#python-style--patterns)
9. [Classes](#classes)
10. [Constants](#constants)
11. [Error Handling](#error-handling)
12. [Logging](#logging)
13. [Caching](#caching)
14. [Models](#models)
15. [Database](#database)
16. [Services](#services)
17. [Controllers](#controllers)
18. [Testing](#testing)
19. [Background Processing](#background-processing)
20. [Security](#security)
21. [Configuration](#configuration)
22. [Documentation](#documentation)
23. [Quick Reference](#quick-reference)

---

## Code Formatting

### PEP 8 Compliance

Follow PEP 8 standards with the following common project modifications:

- **Max line length**: 119 characters (configurable per project)
- **Indentation**: 4 spaces (never tabs)
- **Continuation indent**: 8 spaces

### Linter Configuration

Use flake8 for linting. Recommended configuration (in `setup.cfg` or `.flake8`):

```ini
[flake8]
max-line-length = 119
ignore = W503,W504
```

**IMPORTANT**: After making any code changes, always run your linter and fix all issues before considering the task complete.

### Manual Formatting

Use autopep8 or black for formatting:

```bash
# autopep8
autopep8 -i --max-line-length 119 $FILENAME

# black
black --line-length 119 $FILENAME
```

**Warning**: These modify files in place. Always commit before running.

---

## Naming Conventions

### General Rules

- **Variables**: `snake_case`
- **Functions**: `snake_case`
- **Methods**: `snake_case`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private variables/methods**: `_leading_underscore`
- **Module names**: `snake_case`

### Examples

```python
# Good
def get_user_by_id(user_id: uuid.UUID) -> User:
    pass

class UserService:
    pass

MAX_RETRY_COUNT = 3
_internal_cache = {}

# Bad
def GetUserById(userId):  # Wrong: should be snake_case
    pass

class user_service:  # Wrong: should be PascalCase
    pass

maxRetryCount = 3  # Wrong: constants should be UPPER_SNAKE_CASE
```

### Method Names

**Method names should be short but descriptive enough to convey the action they perform.**

```python
# Good - Clear and descriptive
def create_user(cls, username: str, email: str) -> User:
    pass

def get_item_by_id(cls, item_id: uuid.UUID) -> Item:
    pass

def find_users_by_role(cls, role_id: uuid.UUID) -> List[User]:
    pass

# Bad - Too vague
def process(cls, data):  # What does this do?
    pass

# Bad - Too verbose
def create_new_user_with_username_and_email_address(cls, username, email):
    pass
```

### Boolean Variables and Methods

**Boolean variables and methods should start with prefixes that indicate they return/store boolean values.**

Use prefixes like `is_`, `has_`, `can_`, `should_`, etc.

```python
# Good
is_active = True
has_permission = user.has_role('admin')
can_edit = check_edit_permission(user, resource)
should_retry = error_count < MAX_RETRIES

def is_valid_email(email: str) -> bool:
    pass

def has_access(cls, user_id: uuid.UUID, resource_id: uuid.UUID) -> bool:
    pass

# Bad - Unclear that these are boolean
active = True  # Is this a boolean or an object?
permission = check_permission()  # What does this return?
```

### Module Aliasing

**When importing modules, use consistent aliasing patterns:**

```python
# Good - Consistent aliasing
import app.services.user as user_service
import app.constants.roles as role_constants
import app.models.user as user_model

# Bad - Inconsistent or confusing aliases
import app.services.user as usvc
import app.constants.roles  # No alias when one would help
from app.models import user  # Conflicts with 'user' variable names
```

---

## Imports

### Import Order

Organize imports in the following groups, separated by blank lines:

1. **Standard library imports**
2. **Third-party library imports**
3. **Local/application imports**

Within each group, order alphabetically or by "lowest level" first.

### Import Style

**DO**:
- **Import full modules/packages whenever possible**
- **Place all imports at the top of the file** (after module docstring)
- Group imports with blank lines between groups

**DON'T**:
- Use `from foo import *` (this is NEVER acceptable)
- Use circular partial imports (can cause difficult-to-debug ImportErrors)
- Place imports in the middle of the file (except for conditional/lazy imports)
- Combine multiple imports on one line (except for `typing`)

### Examples

```python
# Good - imports at top, grouped properly
"""Module for user management services."""
import uuid
import datetime
from typing import List, Dict, Optional, Union

from flask import current_app, request
from sqlalchemy import or_

import app.models.user
import app.services.auth


def create_user(username: str) -> User:
    """Create a user."""
    pass

# Bad - various anti-patterns
from uuid import *  # NEVER do this
import datetime, uuid  # Don't combine imports on one line

def some_function():
    import other_module  # Don't put imports in middle of file
    pass
```

### Circular Import Resolution

**When encountering circular import issues, first try to refactor to eliminate the circular dependency. Only use `TYPE_CHECKING` conditional imports as a fallback if refactoring isn't feasible.**

#### Preferred: Refactor to Eliminate Circular Imports

```python
# Before: Circular import
# file: services/user.py
import services.item  # Imports item service

class UserService:
    @classmethod
    def get_user_items(cls, user_id):
        return services.item.ItemService.get_by_user(user_id)

# file: services/item.py
import services.user  # Imports user service - CIRCULAR!

class ItemService:
    @classmethod
    def get_by_user(cls, user_id):
        user = services.user.UserService.get(user_id)
        return Item.query.filter_by(user_id=user.id).all()

# After: Refactored to eliminate circular dependency
# file: services/item.py
class ItemService:
    @classmethod
    def get_by_user(cls, user_id: uuid.UUID):
        # Just use the user_id directly, no need to fetch user
        return Item.query.filter_by(user_id=user_id).all()
```

#### Fallback: TYPE_CHECKING Conditional Imports

```python
from __future__ import annotations
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    import app.models.user as user_models

def get_user_items(user_id: uuid.UUID) -> list[user_models.Item]:
    """Get user's items."""
    import app.models.item
    return app.models.item.Item.query.filter_by(user_id=user_id).all()
```

---

## Type Hints

### General Policy

**Always use type hints** for function parameters and return values in new code.

### Syntax

```python
from typing import List, Dict, Optional, Union
import uuid

def get_items(item_ids: List[uuid.UUID]) -> List[Dict[str, Union[uuid.UUID, str, bool]]]:
    """Fetch items by IDs.

    Args:
        item_ids: List of item UUIDs to fetch

    Returns:
        List of dictionaries containing item data
    """
    pass

def find_user(user_id: uuid.UUID) -> Optional[User]:
    """Find user by ID.

    Args:
        user_id: The user's UUID

    Returns:
        User object if found, None otherwise
    """
    pass
```

### When to Use

- **Required**: All public API methods, service methods, and controller functions
- **Required**: All new code
- **Optional but encouraged**: When updating existing code

---

## Docstrings

### Format: Google Style

Use [Google Sphinx-Napoleon](http://sphinxcontrib-napoleon.readthedocs.org/en/latest/) format for all docstrings.

### Examples

#### Function/Method Docstring

```python
def get_user_profile(user_id: uuid.UUID) -> Dict:
    """Retrieve profile information for a user.

    Args:
        user_id: The UUID of the user to look up

    Returns:
        Dictionary containing user profile data including:
            - id: User UUID
            - name: Display name
            - email: Email address

    Raises:
        NotFoundError: If the user does not exist
        PermissionError: If caller lacks permission to view profile
    """
    pass
```

#### Class Docstring

```python
class UserService:
    """Service for user lifecycle management.

    This service handles user creation, retrieval, and modification.

    Attributes:
        None (all methods are classmethods)
    """

    @classmethod
    def get_user(cls, user_id: uuid.UUID) -> User:
        """Retrieve a user by ID."""
        pass
```

---

## Functions and Methods

### Default Parameters

**Rule**: When calling a function that has parameters with defaults, always use keyword arguments for those parameters.

```python
def create_user(username: str, email: str, is_active: bool = True, role: str = 'user') -> User:
    pass

# Good
user = create_user('john_doe', 'john@example.com', is_active=False, role='admin')

# Bad
user = create_user('john_doe', 'john@example.com', False, 'admin')
```

### Args and Kwargs

- **DO**: Use `*args` and `**kwargs` when appropriate
- **DON'T**: Name them `a` or `kw` (use full names)

```python
# Good
def wrapper(*args, **kwargs):
    return decorated_function(*args, **kwargs)

# Bad
def wrapper(*a, **kw):
    return decorated_function(*a, **kw)
```

### Empty Dictionary to Keyword Args

**DON'T** create a dictionary just to unpack it as keyword arguments.

```python
# Bad
params = {'user_id': user_id, 'include_deleted': True}
result = get_users(**params)

# Good
result = get_users(user_id=user_id, include_deleted=True)
```

### Stateless Methods

If a method doesn't use instance state, make it a `@classmethod` or `@staticmethod`.

```python
class UserService:

    @classmethod
    def validate_email(cls, email: str) -> bool:
        """Validate email format (no instance state needed)."""
        return '@' in email and '.' in email.split('@')[1]
```

---

## Python Style & Patterns

### String Formatting

#### Quote Style

**Use single quotes by default**, double quotes when needed.

```python
# Good - single quotes
name = 'John Doe'
message = 'Hello, world!'

# Good - double quotes when string contains single quotes
message = "It's a beautiful day"

# Good - triple quotes for docstrings
def function():
    """This is a docstring."""
    pass

# Be consistent within a file
```

#### String Formatting Methods

**Prefer f-strings** for most cases. **Use % formatting for logging**.

```python
# Good - f-strings for code
name = 'Alice'
message = f'User {name} logged in'

# Good - % formatting for logging (lazy evaluation)
logger.info('Processing user %s with ID %s', name, user_id)

# Avoid - .format() (use f-strings instead)
message = 'User {} logged in'.format(name)  # Don't use

# Good - f-strings for complex expressions
result = f'Total: ${total:.2f} ({len(items)} items)'
```

**Why % for logging?**
- Lazy evaluation: string formatting only happens if log level is enabled
- Performance: avoids unnecessary string operations

### Conditionals and Comparisons

#### None Comparisons

**Always use `is None` and `is not None`** (identity checks, not equality).

```python
# Good
if user is None:
    return None

if result is not None:
    process(result)

# Bad
if user == None:  # Don't use ==
    return None
```

#### Empty Collection Checks

**Use truthiness** for checking if collections are empty.

```python
# Good - Pythonic truthiness
if my_list:
    process(my_list)

if not my_dict:
    return {}

# Bad - explicit len() checks
if len(my_list) > 0:  # Don't do this
    process(my_list)
```

#### Complex Conditionals

**Extract complex if/elif chains into separate functions** with clear names.

```python
# Good - extracted to functions
def handle_type_a(item):
    """Handle type A processing."""
    pass

def handle_type_b(item):
    """Handle type B processing."""
    pass

def process_item(item):
    """Process item based on type."""
    if item.type == TYPE_A:
        return handle_type_a(item)
    elif item.type == TYPE_B:
        return handle_type_b(item)
    else:
        raise ValueError(f'Unknown item type: {item.type}')

# Bad - long inline conditionals with 50+ lines in each branch
```

#### Early Returns (Guard Clauses)

**Prefer early returns** to reduce nesting.

```python
# Good - early returns
def get_user_item(user_id: uuid.UUID, item_id: uuid.UUID) -> Dict:
    """Get item if user has access."""
    user = User.query.get(user_id)
    if not user:
        raise NotFoundError(f'User not found: {user_id}')

    item = Item.query.get(item_id)
    if not item:
        raise NotFoundError(f'Item not found: {item_id}')

    if not user.has_permission('view_item', item):
        raise PermissionError('User cannot view item')

    return item.to_dict()

# Bad - nested if statements
def get_user_item(user_id, item_id):
    user = User.query.get(user_id)
    if user:
        item = Item.query.get(item_id)
        if item:
            if user.has_permission('view_item', item):
                return item.to_dict()
            else:
                raise PermissionError(...)
        else:
            raise NotFoundError(...)
    else:
        raise NotFoundError(...)
```

### List and Dict Comprehensions

**Prefer comprehensions for simple transformations/filters**. Use loops for complex logic.

```python
# Good - simple comprehension
user_ids = [user.id for user in users]
active_users = [user for user in users if user.is_active]
user_map = {user.id: user.name for user in users}

# Good - loop for complex logic
processed_items = []
for item in items:
    if item.is_published and not item.is_deleted:
        try:
            processed = process_item(item)
            if processed.is_valid():
                processed_items.append(processed)
        except ProcessingError as e:
            logger.error('Failed to process item %s: %s', item.id, e)

# Bad - complex comprehension (hard to read)
processed_items = [
    process_item(item) for item in items
    if item.is_published and not item.is_deleted
    and process_item(item).is_valid()
]  # Don't do this - processes item twice!
```

### Constants and Magic Numbers

**Always extract magic numbers to named constants.**

```python
# Good - named constants
SECONDS_PER_MINUTE = 60
MINUTES_PER_HOUR = 60
CACHE_TIMEOUT_SECONDS = 2 * MINUTES_PER_HOUR * SECONDS_PER_MINUTE  # 2 hours

MAX_RETRY_ATTEMPTS = 3
INITIAL_RETRY_DELAY = 5  # seconds
PAGINATION_DEFAULT_PAGE_SIZE = 20

# Bad - magic numbers
cache.set(key, value, timeout=7200)  # What is 7200?

for attempt in range(3):  # Why 3?
    time.sleep(5)  # Why 5?
```

### Data Types

#### UUID Handling

**Use `uuid.UUID` objects in code, convert to strings only at API boundaries.**

```python
import uuid

# Good - UUID objects internally
def get_item(item_id: uuid.UUID) -> Dict:
    item = Item.query.get(item_id)
    return {
        'id': str(item.id),  # Convert to string for API response
        'title': item.title
    }

# Bad - using strings internally
def get_item(item_id: str) -> Dict:  # Don't use string
    item_uuid = uuid.UUID(item_id)  # Converting repeatedly
    item = Item.query.get(item_uuid)
    return {'id': item_id, 'title': item.title}
```

#### DateTime Handling

**Always use UTC, convert to user timezone only for display.**

```python
from datetime import datetime, timezone

# Good - store in UTC
created_at = datetime.now(timezone.utc)

# Good - convert for display
def format_timestamp(dt: datetime, user_timezone: str) -> str:
    import pytz
    user_tz = pytz.timezone(user_timezone)
    local_dt = dt.replace(tzinfo=timezone.utc).astimezone(user_tz)
    return local_dt.strftime('%Y-%m-%d %H:%M:%S %Z')

# Bad - using naive datetime
created_at = datetime.now()  # Don't use naive datetime
```

### Exception vs Return Value Patterns

**Use mixed approach**: Return `None` for expected not-found cases, raise exceptions for actual errors.

```python
# Return None for expected "not found"
def find_user_by_email(email: str) -> Optional[User]:
    """Find user by email, return None if not found."""
    return User.query.filter_by(email=email).first()

# Raise exception when resource MUST exist
def get_user_by_id(user_id: uuid.UUID) -> User:
    """Get user by ID, raise if not found."""
    user = User.query.get(user_id)
    if not user:
        raise NotFoundError(f'User not found: {user_id}')
    return user
```

### Decorator Stacking Order

**Standard order**: `@route` first, then security/auth, then response formatting.

```python
# Good - correct order
@blueprint.route('/items/<uuid:item_id>')
@login_required
@require_permission('view_item')
def get_item(item_id):
    """Get item by ID."""
    return ItemService.get_item(item_id)

# Bad - wrong order
@login_required  # Wrong - route should be first
@blueprint.route('/items/<uuid:item_id>')
def get_item(item_id):
    pass
```

**Order matters** because decorators are applied bottom-to-top.

### Sensitive Data Handling

**Never log sensitive fields.** Maintain an explicit list of fields to filter.

```python
SENSITIVE_FIELDS = {'password', 'password_hash', 'ssn', 'credit_card', 'api_key', 'secret'}

def safe_log_dict(data: Dict) -> Dict:
    """Return dictionary safe for logging (sensitive fields redacted)."""
    return {
        k: '***REDACTED***' if k in SENSITIVE_FIELDS else v
        for k, v in data.items()
    }

# Good
logger.info('User data: %s', safe_log_dict(user_data))

# Bad - logging sensitive data
logger.info('User: %s', user_data)  # Don't log raw user data!
```

---

## Classes

### Singletons and Stateless Classes

If a class won't gain anything from instantiation (no meaningful state), write it with only `@classmethod`s.

```python
# Good - Stateless service class
class UserService:

    @classmethod
    def get_user(cls, user_id: uuid.UUID) -> User:
        pass

    @classmethod
    def _validate_email(cls, email: str) -> bool:
        pass

# Bad - Unnecessary instantiation
class UserService:

    def get_user(self, user_id: uuid.UUID) -> User:
        pass  # Doesn't use self at all
```

### Class Naming

- Service classes: `*Service` suffix (e.g., `UserService`)
- Model classes: Descriptive noun (e.g., `User`, `Item`, `Order`)
- API classes: Match the resource (e.g., `UserAPI`, `ItemResource`)

---

## Constants

### Location

- **Model-specific constants**: Place in the relevant model module
- **Shared constants**: Place in a `constants` module/package
- **Module-specific constants**: Place in a `{module}/constants/` directory

### Format

```python
# constants/item_type.py
import uuid

VIDEO = uuid.UUID('f5b3f3a5-5f8f-4032-968f-9a9d05b2d27e')
ARTICLE = uuid.UUID('2c8038f9-ed7d-45c1-965a-25f4aa5ff949')
```

### Never Hard Code Values in Services

**Always use constants instead of hard-coded values in service methods and business logic.**

```python
# Good - Use constants
import app.constants.role as role_constants

class UserService:
    @classmethod
    def is_admin(cls, user: User) -> bool:
        return user.role_id == role_constants.ADMIN_ID

# Bad - Hard-coded values
class UserService:
    @classmethod
    def is_admin(cls, user: User) -> bool:
        return user.role_id == uuid.UUID('AAAAAAAA-AAAA-FFFF-FFFB-000000000001')
```

---

## Error Handling

### Exception Types

Define or use standard exception types that map to HTTP status codes:

- `NotFoundError`: Resource doesn't exist (404)
- `PermissionError`: Insufficient permissions (403)
- `ValidationError`: Invalid input (400)
- `BadRequestError`: Bad request (400)

### When to Catch Exceptions

**General Rule**: Let exceptions bubble up to the middleware unless you have a specific reason to catch them.

**DO catch when**:
- Recovering from an unexpected error and continuing processing
- Adding additional context before re-raising
- Logging non-fatal errors that don't prevent request completion

**DON'T catch when**:
- The error should result in an error page (let middleware handle it)
- You're just going to re-raise without adding value
- It's a fatal error that ends the request

```python
# Good - Catching and recovering
def process_items(item_ids: List[uuid.UUID]) -> Dict:
    """Process multiple items, continue on individual failures."""
    results = []
    errors = []

    for item_id in item_ids:
        try:
            result = process_single_item(item_id)
            results.append(result)
        except Exception as e:
            logger.error('Failed to process item %s: %s', item_id, e, exc_info=True)
            errors.append({'item_id': str(item_id), 'error': str(e)})

    return {'results': results, 'errors': errors}

# Bad - Catching just to re-raise
def get_user(user_id: uuid.UUID) -> User:
    try:
        user = User.query.get(user_id)
        if not user:
            raise NotFoundError(f'User not found: {user_id}')
        return user
    except NotFoundError:
        raise  # Don't do this - just let it bubble up!

# Good - Let it bubble up
def get_user(user_id: uuid.UUID) -> User:
    user = User.query.get(user_id)
    if not user:
        raise NotFoundError(f'User not found: {user_id}')
    return user
```

### Error Messages

- Be specific and helpful
- Include relevant identifiers (UUIDs, IDs)
- Don't expose sensitive information

```python
# Good
raise NotFoundError(f'User not found: {user_id}')

# Bad - Not specific enough
raise NotFoundError('User not found')

# Bad - Exposes sensitive info
raise ValidationError(f'Invalid password: {password}')
```

### Optional Dependencies

**Third-party dependencies should fail silently and log** (don't crash the application).

```python
# Good - graceful degradation
try:
    import boto3
    S3_AVAILABLE = True
except ImportError:
    logger.warning('boto3 not available, S3 features disabled')
    S3_AVAILABLE = False

def upload_to_s3(file_path: str) -> Optional[str]:
    if not S3_AVAILABLE:
        logger.warning('S3 upload skipped: boto3 not available')
        return None
    # ... upload logic
```

---

## Logging

### Logger Usage

**Use Python's standard logging module** (or your framework's logger):

```python
import logging

logger = logging.getLogger(__name__)

# Or in Flask:
from flask import current_app
current_app.logger.info('Processing item: %s', item_id)
```

### Log Levels

- `DEBUG`: Detailed diagnostic information
- `INFO`: General informational messages
- `WARNING`: Warning messages for potentially harmful situations
- `ERROR`: Error messages for serious problems
- `CRITICAL`: Critical messages for severe failures

### Logging Guidelines

1. **Use lazy formatting**: Use `%s` placeholders, not f-strings or `.format()`
2. **Include context**: Log relevant IDs, user context, etc.
3. **No sensitive data**: Never log passwords, tokens, or PII
4. **Use exc_info for errors**: Include traceback with `exc_info=True`

```python
# Good
logger.info('User %s accessed item %s', user_id, item_id)
logger.error('Failed to process: %s', error_msg, exc_info=True)

# Bad
logger.info(f'User {user_id} accessed item {item_id}')  # Don't use f-strings
```

---

## Caching

### General Guidelines

- **Use named constants for timeouts** instead of magic numbers
- **Include a version parameter** on cached functions when your caching library supports it
- **Ensure all function arguments** have proper `__repr__` methods for cache key generation
- **Start with short cache timeouts** and increase based on observation

### Timeout Strategy

```python
# Guidelines:
# 5-15 minutes: Frequently changing user-specific data
# 30-60 minutes: Moderately stable data (permissions, configurations)
# 1-2 hours: Stable reference data (taxonomies, lookup tables)

CACHE_SHORT = 60 * 5       # 5 minutes
CACHE_MEDIUM = 60 * 30     # 30 minutes
CACHE_LONG = 60 * 60 * 2   # 2 hours
```

---

## Models

### Error Handling in Models

**NEVER** use `flask.abort()` (or equivalent framework-specific abort) in a model. Raise standard exceptions instead.

```python
# Good - Raise exceptions
class User(db.Model):
    @classmethod
    def get_by_id(cls, user_id: uuid.UUID) -> 'User':
        user = cls.query.get(user_id)
        if not user:
            raise NotFoundError(f'User not found: {user_id}')
        return user

# Bad - Never use abort() in models
class User(db.Model):
    @classmethod
    def get_by_id(cls, user_id: uuid.UUID) -> 'User':
        user = cls.query.get(user_id)
        if not user:
            abort(404)  # NEVER do this in models
        return user
```

---

## Database

### Using the ORM

**Always use the ORM** instead of raw SQL queries.

```python
# Good - using ORM
def get_active_users(account_id: uuid.UUID) -> List[User]:
    return User.query.filter(
        User.account_id == account_id,
        User.is_active == True
    ).order_by(User.username).all()

# Bad - using raw SQL
def get_active_users(account_id: uuid.UUID):
    result = db.session.execute(
        "SELECT * FROM users WHERE account_id = :id AND is_active = 1",
        {'id': str(account_id)}
    )
    return result.fetchall()
```

**Why use ORM:**
- **Type safety**: Work with Python objects, not tuples
- **SQL injection prevention**: ORM automatically parameterizes queries
- **Database independence**: ORM abstracts away database-specific SQL
- **Maintainability**: Changes to models automatically update queries
- **Relationships**: Easy access to related objects

**Rare exceptions** (when raw SQL is acceptable):
- Complex analytical queries that ORM makes too cumbersome
- Performance-critical bulk operations
- Database-specific features not supported by ORM

When you must use raw SQL, always use parameterized queries.

### Query Optimization

- Use `.with_entities()` for selective column queries
- Avoid N+1 queries with proper joins/eager loading
- Use pagination for large result sets

---

## Services

### Purpose

The service layer implements business logic and should be built on top of models and/or other services.

### Structure

```python
import uuid
from typing import List, Dict, Optional

import app.models.user
from app.extensions import db


class UserService:
    """Service for user-related business logic."""

    @classmethod
    def get_user(cls, user_id: uuid.UUID) -> User:
        """Get user by ID.

        Args:
            user_id: User UUID to retrieve

        Returns:
            User object

        Raises:
            NotFoundError: If user doesn't exist
        """
        user = app.models.user.User.query.get(user_id)
        if not user:
            raise NotFoundError(f'User not found: {user_id}')
        return user

    @classmethod
    def create_user(cls, username: str, email: str, commit: bool = True) -> User:
        """Create a new user.

        Args:
            username: Desired username
            email: User email address
            commit: Whether to commit immediately (default True)

        Returns:
            Created user
        """
        user = User(username=username, email=email)
        db.session.add(user)
        if commit:
            db.session.commit()
        return user
```

### Service Layer Guidelines

1. **All database operations should be in services**, not controllers
2. **Use @classmethod** for all service methods (services are stateless)
3. **Services should commit their own transactions**
4. **Permission checks belong in the service layer**
5. Use `commit=True` parameter for methods that may need batching
6. Private helper methods use underscore prefix `_method_name`

### Permission Checks in Services

```python
# Good - Permission check in service
class ItemService:
    @classmethod
    def get_item(cls, item_id: uuid.UUID, user: User) -> Item:
        item = Item.query.get(item_id)
        if not item:
            raise NotFoundError(f'Item not found: {item_id}')
        if not user.has_permission('view_item', item):
            raise PermissionError('Access denied')
        return item

# Controller just calls service
@blueprint.route('/items/<uuid:item_id>')
def get_item(item_id):
    item = ItemService.get_item(item_id, g.user)
    return jsonify(item.to_dict())
```

---

## Controllers

### Purpose

Controllers handle HTTP requests, validate input, call services, and return responses. Keep them thin.

### Guidelines

1. **Keep thin**: Controllers should delegate to services
2. **No business logic**: Business rules belong in services
3. **Input validation**: Use schemas for validation
4. **Error handling**: Let decorators/middleware handle most error responses

### URI Design

- **DO NOT** include trailing forward slashes in URIs
- Use `strict_slashes=False` on blueprints to allow both

```python
blueprint = Blueprint('items', __name__, url_prefix='/v1/items', strict_slashes=False)

@blueprint.route('/<uuid:item_id>')
def get_item(item_id):
    """Matches both /v1/items/{id} and /v1/items/{id}/"""
    return jsonify(ItemService.get_item(item_id).to_dict())
```

### Serialization

**Use a mix of `to_dict()` methods and schema libraries** (e.g., Marshmallow) based on complexity.

```python
# Simple - to_dict() method
class User(db.Model):
    def to_dict(self):
        return {
            'id': str(self.id),
            'username': self.username,
            'email': self.email
            # password_hash intentionally excluded
        }

# Complex - Marshmallow schema
from marshmallow import Schema, fields, validate

class UserSchema(Schema):
    id = fields.UUID(required=True)
    username = fields.Str(required=True, validate=validate.Length(max=100))
    email = fields.Email(required=True)
```

### Pagination

**Use `page` and `per_page` query parameters** for pagination.

```python
@blueprint.route('/')
def list_items():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', PAGINATION_DEFAULT_PAGE_SIZE, type=int)

    pagination = Item.query.paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'data': [item.to_dict() for item in pagination.items],
        'meta': {
            'page': pagination.page,
            'per_page': pagination.per_page,
            'total': pagination.total,
            'pages': pagination.pages
        }
    })
```

---

## Testing

### Framework

Use **pytest** (NOT unittest or nosetests).

### Test Structure

**DO NOT** inherit from `unittest.TestCase` unless you have a specific reason.

```python
# Good - pytest style
def test_get_user(db_session, user_fixture):
    result = UserService.get_user(user_fixture.id)
    assert result.id == user_fixture.id
    assert result.username == user_fixture.username

# Bad - unittest style
class TestUserService(unittest.TestCase):
    def test_get_user(self):
        pass
```

### Test Naming Conventions

- **Test files**: `test_*.py` (e.g., `test_user_service.py`)
- **Test functions**: `test_*()` (e.g., `test_get_user`, `test_user_not_found_raises_error`)
- **Test classes** (optional): `Test*` (e.g., `TestUserService`)

### Test Isolation

Always use database isolation fixtures (transactions, test databases, etc.) for tests that touch the database.

### Fixtures

1. **First**: Reuse existing fixtures from `conftest.py`
2. **Second**: Create fixtures in module `conftest.py` for reusability
3. **Last Resort**: Create fixtures within individual test files

```python
# Good - Use fixtures, reference IDs from fixtures
def test_user_has_items(db_session, user_with_items):
    result = ItemService.get_user_items(user_with_items.id)
    assert len(result) > 0

# Bad - Hard-coding IDs in tests
def test_user_has_items(db_session):
    user_id = uuid.UUID('f5b3f3a5-5f8f-4032-968f-9a9d05b2d27e')  # Don't hard-code
    result = ItemService.get_user_items(user_id)
```

### Hard-Code UUIDs for Test Data

**In test fixture definitions, use hard-coded UUIDs instead of `uuid.uuid4()` for easier debugging.**

```python
# Good - Hard-coded UUIDs for deterministic tests
TEST_USER_ID = uuid.UUID('9db48314-bf1f-4210-a003-06b777679407')

def test_get_user(db_session):
    user = User(id=TEST_USER_ID, username='testuser')
    db_session.add(user)
    db_session.commit()

    result = UserService.get_user(TEST_USER_ID)
    assert result.id == TEST_USER_ID

# Bad - Random UUIDs make debugging difficult
def test_get_user(db_session):
    user_id = uuid.uuid4()  # Different every test run, can't search logs
```

### Test Best Practices

1. **Isolation**: Tests should be independent and not rely on execution order
2. **Repeatability**: Tests should produce the same results every time
3. **Clarity**: Test names should clearly describe what is being tested
4. **Single Assertion Focus**: Each test should verify one specific behavior
5. **Arrange-Act-Assert**: Structure tests with clear setup, execution, and verification sections

```python
def test_user_creation_sets_default_role(db_session):
    """Test that newly created users receive the default role."""
    # Arrange
    username = 'new_user'
    email = 'new_user@example.com'

    # Act
    user = UserService.create_user(username=username, email=email)

    # Assert
    assert user.role == 'user'
    assert user.username == username
```

### Mocking

**Always mock external services** in tests:

```python
from unittest.mock import patch, MagicMock

def test_upload_to_s3(db_session, monkeypatch):
    """Test S3 upload with mocked AWS service."""
    mock_s3 = MagicMock()
    mock_s3.upload_file.return_value = {'success': True}

    monkeypatch.setattr('app.services.storage.s3_client.upload', mock_s3.upload_file)

    result = upload_file('test.jpg', b'content')

    assert result['success'] is True
    mock_s3.upload_file.assert_called_once()
```

### Common Testing Patterns

```python
# Testing exceptions
def test_invalid_user_raises_not_found(db_session):
    with pytest.raises(NotFoundError):
        UserService.get_user(uuid.uuid4())

# Parametrized tests
@pytest.mark.parametrize('role,expected_permission', [
    ('admin', 'manage_users'),
    ('editor', 'edit_content'),
    ('viewer', 'view_content'),
])
def test_role_permissions(db_session, role, expected_permission):
    user = create_user(role=role)
    assert user.has_permission(expected_permission)
```

---

## Background Processing

### Choosing the Right Approach

- **Task queue** (Celery, Dramatiq, etc.): For user-initiated long operations
- **Batch jobs**: For scheduled or resource-intensive processing
- **Background threads**: Only for quick operations (< 30 seconds)

### Batch Job Best Practices

1. **Comprehensive Logging**: Log start, progress, completion, and errors
2. **Exit Codes**: Return 0 for success, non-zero for failure
3. **Idempotency**: Design jobs to be safely re-runnable
4. **Parameters**: Use argparse for flexible command-line arguments

```python
# Batch job with progress tracking
def run(self):
    items = get_items_to_process()
    total = len(items)

    logger.info('Processing %d items', total)

    for i, item in enumerate(items, 1):
        process_item(item)
        if i % 100 == 0:
            logger.info('Progress: %d/%d (%d%%)', i, total, (i * 100) // total)

    logger.info('Completed processing %d items', total)
    return 0
```

---

## Security

### Input Validation

- **Always** validate user input
- Use schema libraries (Marshmallow, Pydantic) for complex validation
- Sanitize output when rendering HTML
- Use parameterized queries (ORM does this automatically)

### Common Vulnerabilities to Prevent

- SQL injection (use ORM, not raw SQL)
- XSS (escape output)
- CSRF (use CSRF tokens on POST/PUT/DELETE)
- Command injection (validate shell inputs)
- Path traversal (validate file paths)

### CSRF Protection

**All POST/PUT/DELETE requests MUST use CSRF protection.**

### Authentication & Authorization

- Use your framework's authentication decorators
- Never store plaintext passwords
- Use secure session management
- Implement role-based access control in the service layer

---

## Configuration

### Layered Configuration

Use a layered configuration approach where later layers override earlier:

1. **Base Config**: Default values for all settings
2. **Environment Config**: Environment-specific overrides (dev, staging, prod)
3. **Personal Config**: Individual developer overrides (not version controlled)

### Best Practices

1. Use personal/local config for individual overrides (not version controlled)
2. Keep sensitive values in environment variables, never in committed config files
3. Document non-standard config values
4. Never hardcode passwords, API keys, or secrets

```python
# Access config values
value = app.config['SOME_SETTING']
value = app.config.get('SOME_SETTING', default_value)
```

---

## Documentation

### Code Comments

- Use comments sparingly
- Prefer self-documenting code
- Comment "why", not "what"
- Keep comments up-to-date

```python
# Good
# Expire all objects because we're switching database contexts
db.session.expire_all()

# Bad
# Call expire_all
db.session.expire_all()
```

---

## Quick Reference

```python
# String formatting
name = 'Alice'
message = f'Hello, {name}'  # f-strings in code
logger.info('Processing user %s', name)  # % in logging

# Comparisons
if value is None:  # Use 'is None'
if my_list:  # Use truthiness for empty checks

# Early returns
if not user:
    raise NotFoundError('User not found')
# Continue with main logic

# Comprehensions (simple only)
ids = [item.id for item in items]

# Constants
MAX_RETRIES = 3  # Always name magic numbers

# UUIDs
def process(item_id: uuid.UUID):  # UUID objects in code
    return {'id': str(item_id)}  # Strings at API boundary

# DateTime
created_at = datetime.now(timezone.utc)  # Always UTC

# Decorators (order matters!)
@blueprint.route()
@login_required
def endpoint():
    pass

# Sensitive data
logger.info('Data: %s', safe_log_dict(user_data))

# Service pattern
class ItemService:
    @classmethod
    def get_item(cls, item_id: uuid.UUID) -> Item:
        pass

# Test pattern
def test_something(db_session, fixture):
    # Arrange
    data = setup()
    # Act
    result = function_under_test(data)
    # Assert
    assert result.value == expected

# Exception pattern
def test_raises(db_session):
    with pytest.raises(NotFoundError):
        function_that_should_fail()
```

---

## Resources

### Python & Style
- [PEP 8 Style Guide](https://pep8.org/)
- [Google Python Style Guide](https://google.github.io/styleguide/pyguide.html)
- [Sphinx-Napoleon Documentation](http://sphinxcontrib-napoleon.readthedocs.org/)

### Frameworks
- [Flask Documentation](https://flask.palletsprojects.com/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)

### Testing
- [pytest Documentation](https://docs.pytest.org/)
- [pytest Fixtures](https://docs.pytest.org/en/stable/fixture.html)
- [pytest Parametrize](https://docs.pytest.org/en/stable/parametrize.html)
