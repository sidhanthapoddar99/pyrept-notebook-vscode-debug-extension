# Production Deployment Checklist

## Pre-deployment Verification

### 1. Code Quality
- [ ] Run linting: `npm run lint`
- [ ] Run tests: `npm test`
- [ ] Remove all `console.log` statements (except necessary debug output)
- [ ] Update all TypeScript types and interfaces
- [ ] Ensure proper error handling throughout

### 2. Visual Assets
- [ ] Create high-quality icon (128x128px minimum)
- [ ] Create marketplace banner image (1280x640px)
- [ ] Record demo GIFs/videos for marketplace page
- [ ] Take screenshots for documentation

### 3. Documentation
- [ ] Update README.md with production content
- [ ] Create comprehensive user guide
- [ ] Write CHANGELOG.md
- [ ] Update LICENSE file
- [ ] Add contribution guidelines (CONTRIBUTING.md)

### 4. Package Configuration
- [ ] Set correct version number (1.0.0 for initial release)
- [ ] Update publisher ID to match marketplace account
- [ ] Add repository URL
- [ ] Add bug reporting URL
- [ ] Add categories and keywords
- [ ] Set proper display name and description

### 5. Final Testing
- [ ] Test on Windows, macOS, and Linux
- [ ] Test with different VS Code themes
- [ ] Test with various debug configurations
- [ ] Test file associations
- [ ] Verify all commands work

## Marketplace Preparation

### 1. Create Publisher Account
1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with Microsoft account
3. Create publisher profile with ID: `sid1999`

### 2. Generate Personal Access Token (PAT)
1. Visit https://dev.azure.com
2. Click User Settings > Personal Access Tokens
3. Create new token with:
   - Name: "VS Code Marketplace"
   - Organization: All accessible organizations
   - Expiration: Custom (1 year)
   - Scopes: Marketplace > Publish

### 3. Install VSCE (VS Code Extension Manager)
```bash
npm install -g @vscode/vsce
```

### 4. Verify Extension
```bash
vsce ls  # List files that will be included
vsce package  # Create .vsix file for testing
```

## Publishing Process

### 1. Login to VSCE
```bash
vsce login <piblisher-id>
# Enter your PAT when prompted
```

### 2. Package Extension
```bash
# Clean build
rm -rf out/
npm run compile

# Create package
vsce package
```

### 3. Test Locally
1. Install .vsix file in VS Code
2. Test all features one final time

### 4. Publish to Marketplace
```bash
vsce publish
```

### 5. Verify Publication
1. Visit: https://marketplace.visualstudio.com/items?itemName=sid1999.debug-notebook
2. Check all details are correct
3. Test installation from marketplace

## Post-deployment

### 1. Monitor Feedback
- Check marketplace reviews
- Monitor GitHub issues
- Respond to user feedback

### 2. Version Updates
```bash
# For patch updates (1.0.0 -> 1.0.1)
vsce publish patch

# For minor updates (1.0.0 -> 1.1.0)
vsce publish minor

# For major updates (1.0.0 -> 2.0.0)
vsce publish major
```

### 3. Marketing
- Post on Twitter/social media
- Write blog post about the extension
- Share on relevant developer forums
- Submit to VS Code extension collections

## Maintenance

### Regular Tasks
- Update dependencies monthly
- Address security vulnerabilities
- Fix reported bugs promptly
- Add requested features
- Keep documentation current

### Version Planning
- Plan features for next release
- Create GitHub milestones
- Tag issues appropriately
- Update roadmap