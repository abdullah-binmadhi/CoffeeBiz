# Security Policy

## Supported Versions

We currently support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it by emailing [security@coffeebiz-analytics.com] or creating a private security advisory on GitHub.

**Please do not report security vulnerabilities through public GitHub issues.**

## Security Measures

### Development Dependencies

This project uses several development dependencies that may have known vulnerabilities. These dependencies are only used during development and testing and are not included in the production build.

Current known development dependency vulnerabilities:
- `react-scripts`: Contains transitive dependencies with moderate/high severity issues
- `vitest`: Contains esbuild vulnerability (development server only)
- Various webpack/postcss related issues (development only)

These vulnerabilities do not affect the production application as:
1. Development dependencies are not included in the production build
2. The production build is a static React application served via GitHub Pages
3. No server-side code from development dependencies runs in production

### Production Security

The production application:
- Uses only production dependencies in the built application
- Serves static files via GitHub Pages (no server-side execution)
- Implements client-side security best practices
- Uses HTTPS for all communications

### Dependency Management

We regularly review and update dependencies, prioritizing:
1. Critical and high severity vulnerabilities in production dependencies
2. Security patches for runtime dependencies
3. Development dependency updates when they don't introduce breaking changes

## Security Best Practices

When contributing to this project:
1. Keep dependencies up to date
2. Use `npm audit` to check for vulnerabilities
3. Avoid adding unnecessary dependencies
4. Follow secure coding practices
5. Validate all user inputs
6. Use HTTPS for all external communications

## Contact

For security-related questions or concerns, please contact the maintainers through the project's GitHub repository.