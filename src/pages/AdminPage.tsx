import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AdminLogin } from '../components/AdminLogin'
import { AdminPortal } from '../components/AdminPortal'
import { supabase } from '../lib/supabaseClient'

export function AdminPage() {
    const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('adminLoggedIn'))
    const navigate = useNavigate()

    return isLoggedIn ? (
        <AdminPortal
            onLogout={async () => {
                await supabase.auth.signOut()
                localStorage.removeItem('adminLoggedIn')
                setIsLoggedIn(false)
                navigate('/admin')
            }}
        />
    ) : (
        <AdminLogin
            onLoginSuccess={() => {
                localStorage.setItem('adminLoggedIn', 'true')
                setIsLoggedIn(true)
            }}
        />
    )
}