---
paths: ["**/*.py"]
---

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
