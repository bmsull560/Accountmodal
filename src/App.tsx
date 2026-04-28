import './App.css'
import { ProspectPromptBuilder } from './components/ProspectPromptBuilder'

function App() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6 dark:bg-zinc-950">
      <div className="w-full max-w-2xl">
        <ProspectPromptBuilder
          onCreateSetup={async (payload) => {
            console.log('Payload:', payload)
            await new Promise((r) => setTimeout(r, 1200))
            return { accountId: 'demo-account-1' }
          }}
        />
      </div>
    </div>
  )
}

export default App
