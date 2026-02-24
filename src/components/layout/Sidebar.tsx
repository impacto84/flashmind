'use client';

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrainCircuit, FileText, Layers, Network, LayoutDashboard, Settings, LogOut, FolderOpen } from "lucide-react";
import { useUser } from "@/hooks/useSupabase";

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/folders', label: 'Pastas', icon: FolderOpen },
    { href: '/documents', label: 'Documentos', icon: FileText },
    { href: '/flashcards', label: 'Flashcards', icon: Layers },
    { href: '/mindmaps', label: 'Mapas Mentais', icon: Network },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { user, signOut } = useUser();

    return (
        <aside className="w-64 border-r bg-muted/30 flex flex-col h-full hidden md:flex">
            <div className="p-4 border-b">
                <h2 className="text-xl font-bold flex items-center gap-2 text-primary">
                    <BrainCircuit className="w-6 h-6" />
                    FlashMind
                </h2>
                <p className="text-xs text-muted-foreground mt-1">Seu segundo cérebro com IA</p>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
                <nav className="space-y-1 px-2 text-sm font-medium">
                    {navItems.map(item => {
                        const isActive = pathname === item.href ||
                            (item.href !== '/' && pathname.startsWith(item.href));
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-3 py-2 transition-all rounded-md ${
                                    isActive
                                        ? 'bg-primary/10 text-primary font-semibold'
                                        : 'text-muted-foreground hover:text-primary hover:bg-muted'
                                }`}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </div>

            <div className="p-4 border-t space-y-1">
                {user && (
                    <p className="text-xs text-muted-foreground truncate px-3 mb-2">
                        {user.email}
                    </p>
                )}
                <Link href="/settings" className={`flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all rounded-md ${
                    pathname === '/settings' ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-primary hover:bg-muted'
                }`}>
                    <Settings className="h-4 w-4" />
                    Configurações
                </Link>
                <button
                    onClick={signOut}
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground transition-all hover:text-destructive hover:bg-destructive/10 rounded-md w-full"
                >
                    <LogOut className="h-4 w-4" />
                    Sair
                </button>
            </div>
        </aside>
    );
}
