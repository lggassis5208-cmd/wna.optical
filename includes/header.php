<?php
$base_url = '/'; // Se estiver no localhost:8000, a base eh /
?>
<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ótica Lis Retail ERP</title>
    <!-- Tailwind CSS na Nuvem (CDN) -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            darkMode: 'class',
            theme: {
                extend: {
                    colors: {
                        brand: {
                            bg: '#1A1A1A',
                            gold: '#EAB308',
                            goldHover: '#CA8A04',
                            surface: '#262626',
                            border: '#404040'
                        }
                    }
                }
            }
        }
    </script>
    <style>
        body { background-color: #1A1A1A; color: #f3f4f6; }
    </style>
</head>
<body class="flex h-screen overflow-hidden text-gray-200">

    <!-- Sidebar lateral Esquerda -->
    <aside class="w-64 bg-brand-surface border-r border-brand-border flex flex-col">
        <div class="h-20 flex items-center justify-center border-b border-brand-border px-4 py-2">
            <!-- Renderiza a logo exigida -->
            <img src="<?= $base_url ?>logo otica.png" alt="Ótica Lis Logo" class="h-full object-contain" 
                 onerror="this.outerHTML='<h1 class=\'text-2xl font-bold text-brand-gold uppercase tracking-widest\'>Ótica LIS</h1>'">
        </div>
        <nav class="flex-1 p-4 space-y-2 overflow-y-auto mt-2">
            <a href="<?= $base_url ?>index.php" class="flex items-center px-4 py-3 rounded-md hover:bg-brand-border transition-colors text-gray-300 hover:text-brand-gold group">
                <svg class="w-5 h-5 mr-3 text-gray-500 group-hover:text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
                Dashboard
            </a>
            <a href="<?= $base_url ?>pages/cadastro-cliente.php" class="flex items-center px-4 py-3 rounded-md hover:bg-brand-border transition-colors text-gray-300 hover:text-brand-gold group">
                <svg class="w-5 h-5 mr-3 text-gray-500 group-hover:text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                Clientes (Lis Score)
            </a>
            <a href="<?= $base_url ?>pages/produtos.php" class="flex items-center px-4 py-3 rounded-md hover:bg-brand-border transition-colors text-gray-300 hover:text-brand-gold group">
                <svg class="w-5 h-5 mr-3 text-gray-500 group-hover:text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                Estoque / SEFAZ
            </a>
            <a href="<?= $base_url ?>pages/checkout.php" class="flex items-center px-4 py-3 rounded-md hover:bg-brand-border transition-colors text-gray-300 hover:text-brand-gold group">
                <svg class="w-5 h-5 mr-3 text-gray-500 group-hover:text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                Checkout (PDV)
            </a>
        </nav>
        <div class="p-4 border-t border-brand-border text-sm text-gray-500 flex items-center justify-between">
            <span>Ótica Lis v1.0</span>
            <span class="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
        </div>
    </aside>

    <!-- Content Area (Main) -->
    <main class="flex-1 flex flex-col overflow-hidden bg-brand-bg relative shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.5)]">
        <!-- Topo da página interna -->
        <header class="h-20 border-b border-brand-border flex items-center justify-between px-8 bg-brand-surface/70 backdrop-blur-md z-10">
            <h2 class="text-xl font-bold text-gray-200 uppercase tracking-wider" id="page-title">Workspace</h2>
            <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-full bg-brand-gold text-brand-bg flex items-center justify-center font-bold text-lg shadow-md border-2 border-brand-gold">
                    OL
                </div>
            </div>
        </header>
        
        <!-- Viewport rolável -->
        <div class="flex-1 overflow-y-auto p-8 relative">
