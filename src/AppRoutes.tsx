import { Routes, Route } from 'react-router-dom'

function HomePlaceholder() {
    return <h1>Home Page</h1>
}

function AdminPlaceholder() {
    return <h1>Admin Page</h1>
}

export function AppRoutes() {
    return (
        <Routes>
            <Route path="/" element={<HomePlaceholder />} />
            <Route path="/admin" element={<AdminPlaceholder />} />
        </Routes>
    )
}