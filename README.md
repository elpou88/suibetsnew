# WAL.app Crypto Betting Platform

A cutting-edge sports betting platform that leverages blockchain technology to create a secure and engaging betting ecosystem with comprehensive multi-sport data integration.

## Technologies

- React frontend with advanced interactivity
- Express backend with multi-sport API handlers
- Sui blockchain integration for secure transactions
- Tailwind CSS for responsive design
- Framer Motion for dynamic animations
- Advanced real-time sports data processing

## Recent Features

### Event Tracking Service

The platform now has an automated event tracking system that monitors upcoming events and transitions them to live events when the games start. This ensures that users always have access to the most current and accurate information.

**Key functionality:**
- Periodically checks the status of upcoming events (every 60 seconds)
- Automatically identifies events that have gone live
- Updates event information with real-time scores and stats
- Maintains historical tracking of events that have transitioned to live status

**API Endpoints:**
- `/api/events/tracked` - Shows all events that have transitioned from upcoming to live status

### Multi-Sport Data Integration

The platform integrates with multiple sports APIs to provide real-time and upcoming event data for over 30 different sports, including:

- Football (Soccer)
- Basketball
- Tennis
- Baseball
- Hockey
- Handball
- Volleyball
- Rugby
- Cricket
- Golf
- Boxing
- MMA/UFC
- Formula 1
- Cycling
- American Football

Each sport has its own dedicated API integration to ensure accurate and sport-specific data representation.

### Real-time Betting

The platform supports real-time betting on live events with:
- Dynamically updated odds
- Multiple betting markets for each sport
- Live score updates
- Cash-out options

## Blockchain Integration

- Native integration with the Sui blockchain
- Support for multiple wallet providers
- Betting using both Sui tokens and SBETS tokens
- Secure transaction verification
- Smart contract-based bet settlement
- Automated dividend distribution

## License

Proprietary - All rights reserved