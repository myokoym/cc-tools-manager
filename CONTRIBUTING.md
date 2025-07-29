# Contributing to CC Tools Manager

Thank you for your interest in contributing to CC Tools Manager! This document provides guidelines and instructions for contributing to the project.

## Language Requirements

### Code and Documentation

- **Primary language**: English
- **Documentation**: Write all new documentation in English only
- **Code comments**: English only
- **Commit messages**: English only

**Note**: Contributors do NOT need to provide Japanese translations. The Japanese documentation (*.ja.md files) will be maintained separately by the project maintainers.

## Development Process

### 1. Fork and Clone

```bash
git clone https://github.com/yourusername/cc-tools-manager.git
cd cc-tools-manager
npm install
```

### 2. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 3. Make Your Changes

- Write code following the existing style and conventions
- Add tests for new functionality
- Update documentation as needed (English only)

### 4. Test Your Changes

```bash
npm test
npm run lint
npm run typecheck
```

### 5. Commit Your Changes

Write clear, concise commit messages in English:

```bash
git commit -m "Add feature X to improve Y"
```

Follow conventional commit format when possible:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, missing semicolons, etc.)
- `refactor:` Code refactoring
- `test:` Test additions or modifications
- `chore:` Maintenance tasks

### 6. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub with:
- Clear description of changes
- Reference to any related issues
- Screenshots if applicable (for UI changes)

## Code Style Guidelines

### TypeScript

- Use TypeScript strict mode
- Provide type annotations for function parameters and return values
- Avoid `any` type unless absolutely necessary
- Use interfaces for object shapes

### General

- Use meaningful variable and function names
- Keep functions small and focused
- Add error handling for edge cases
- Follow existing patterns in the codebase

## Testing

- Write unit tests for new functionality
- Ensure all tests pass before submitting PR
- Aim for good test coverage
- Test edge cases and error conditions

## Documentation

When updating documentation:
- Write in clear, concise English
- Include code examples where helpful
- Update README.md if adding new features
- Do NOT create or update Japanese translations (*.ja.md files)

## Pull Request Guidelines

### Before Submitting

- [ ] Code follows project style guidelines
- [ ] Tests pass locally
- [ ] Documentation is updated (English only)
- [ ] Commit messages are clear and descriptive
- [ ] Branch is up to date with main

### PR Description Should Include

- What changes were made
- Why these changes were made
- How to test the changes
- Any breaking changes

## Questions?

If you have questions about contributing, please:
1. Check existing issues and pull requests
2. Create a new issue for discussion
3. Ask in the pull request

## License

By contributing to CC Tools Manager, you agree that your contributions will be licensed under the MIT License.