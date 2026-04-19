import Header from './Header'
import Footer from './Footer'

export default function Layout({ children }) {
    return (
        <div className="flex flex-col justify-between min-h-screen">
            <style>{
                `@import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');`
            }
            </style>
            <Header />
            <main>
                {children}
            </main>
            <Footer />
        </div>
    )
}
