
# FeraSetu

FeraSetu helps local shopkeepers create an online store, manage products and orders, and sell online without needing technical knowledge.

> ⚠️ FeraSetu is currently under active development. Some features are still being built and may change.

## Why I Built This

Many small businesses in India still take orders through phone calls or WhatsApp. That works, but managing products, orders, and customers quickly becomes difficult.

I started FeraSetu to make it easier for shopkeepers to have their own online shop without paying for expensive e-commerce software or learning complicated tools.

## Features

- Create and manage products
- Customer authentication
- Order management
- Shop dashboard
- AI assistant for shop management *(work in progress)*
- Responsive design for mobile and desktop
- Secure authentication using Appwrite

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Appwrite
- Cloudflare Workers
- Node.js

## Project Structure

```
src/
├── components/
├── pages/
├── hooks/
├── lib/
├── services/
└── assets/
```

## Getting Started

Clone the repository.

```bash
git clone https://github.com/your-username/ferasetu.git
```

Move into the project.

```bash
cd ferasetu
```

Install dependencies.

```bash
npm install
```

Start the development server.

```bash
npm run dev
```

The app should now be running locally.

## Environment Variables

Create a `.env` file and add the required Appwrite configuration.

```env
VITE_APPWRITE_ENDPOINT=
VITE_APPWRITE_PROJECT_ID=
```

## Screenshots

Coming soon.

## Roadmap

- [x] Authentication
- [x] Dashboard
- [x] Product Management
- [ ] AI Assistant
- [ ] Website Builder
- [ ] Payment Integration
- [ ] Analytics
- [ ] Multi-language Support

## Contributing

Contributions, bug reports, and feature suggestions are always welcome.

If you find a bug or have an idea, feel free to open an issue or submit a pull request.

## License

This project is licensed under the MIT License.

---

Made with ❤️ while learning, building, and improving every day.
