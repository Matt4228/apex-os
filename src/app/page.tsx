import WelcomeScreen from "@/components/welcome/WelcomeScreen"

// Signed-in visitors never get here: the proxy sends them to the dashboard
export default function HomePage() {
  return <WelcomeScreen initialMode="login" homePath="/" />
}
