import { AppStoreProvider } from './store/AppStore'
import AuthGate from './components/Auth/AuthGate'
import StudyApp from './study/StudyApp'
import './App.css'

export default function App() {
  return (
    <AppStoreProvider>
      <AuthGate>
        <StudyApp />
      </AuthGate>
    </AppStoreProvider>
  )
}
