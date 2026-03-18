<?php
require_once __DIR__ . '/includes/config.php';
$base_url = './';
require_once __DIR__ . '/includes/header.php';

// Obtem as métricas de vendas e clientes via PDO
$clients_count = '--';
$sales_today = '--';
$revenue_today = '--';

try {
    if (isset($pdo)) {
        // Conta clientes totais
        $stmt = $pdo->query("SELECT COUNT(*) FROM clients");
        $clients_count = $stmt->fetchColumn();
        
        // Coleta vendas do dia vigente
        $stmt = $pdo->query("SELECT COUNT(*), COALESCE(SUM(total_amount), 0) FROM sales WHERE DATE(created_at) = CURDATE()");
        $row = $stmt->fetch(PDO::FETCH_NUM);
        $sales_today = $row[0];
        $revenue_today = $row[1];
    }
} catch (Exception $e) {
    // Evita crash brutal caso a tabela não exista ainda.
    $clients_count = '0';
    $sales_today = '0';
    $revenue_today = '0';
}
?>

<div data-page-title="Dashboard Gerencial"></div>

<div class="mb-10">
    <h1 class="text-3xl font-bold text-gray-100 mb-2">Resumo da Operação</h1>
    <p class="text-gray-400">Métricas financeiras e de cadastro atualizadas em tempo real.</p>
</div>

<!-- Grid de Métricas Principais -->
<div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
    
    <!-- Vendas Hoje -->
    <div class="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-xl relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-brand-gold/10 rounded-full blur-xl group-hover:bg-brand-gold/20 transition-all"></div>
        <div class="flex justify-between items-start relative z-10">
            <div>
                <p class="text-gray-400 mb-2 font-medium">Vendas (Hoje)</p>
                <h3 class="text-4xl font-black text-gray-100"><?= $sales_today ?></h3>
            </div>
            <div class="p-3 bg-brand-gold/10 rounded-lg text-brand-gold border border-brand-gold/30 shadow-[0_0_15px_rgba(234,179,8,0.2)]">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
            </div>
        </div>
    </div>
    
    <!-- Receita Hoje -->
    <div class="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-xl relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
        <div class="flex justify-between items-start relative z-10">
            <div>
                <p class="text-gray-400 mb-2 font-medium">Receita (Hoje)</p>
                <h3 class="text-4xl font-black text-emerald-400">R$ <?= number_format((float)$revenue_today, 2, ',', '.') ?></h3>
            </div>
            <div class="p-3 bg-emerald-500/10 rounded-lg text-emerald-500 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            </div>
        </div>
    </div>
    
    <!-- Total Clientes -->
    <div class="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-xl relative overflow-hidden group">
        <div class="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
        <div class="flex justify-between items-start relative z-10">
            <div>
                <p class="text-gray-400 mb-2 font-medium">Base de Clientes</p>
                <h3 class="text-4xl font-black text-blue-400"><?= $clients_count ?></h3>
            </div>
            <div class="p-3 bg-blue-500/10 rounded-lg text-blue-500 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5V10a2 2 0 00-2-2h-5m-9 8h10M4 16h10m-10 4h10M4 12h10M4 8h10"></path></svg>
            </div>
        </div>
    </div>
</div>

<!-- Empty State do Gráfico (Apenas placeholder visual) -->
<div class="bg-brand-surface border border-brand-border rounded-xl p-6 shadow-xl h-64 flex flex-col items-center justify-center relative overflow-hidden">
    <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wNSkiLz48L3N2Zz4=')] opacity-50"></div>
    <div class="p-4 bg-brand-bg rounded-full border border-brand-border mb-4 relative z-10">
        <svg class="w-8 h-8 text-brand-gold opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
    </div>
    <p class="text-gray-400 font-medium relative z-10 text-center max-w-sm">Os gráficos de performance serão exibidos aqui após processarmos o primeiro fechamento de caixa mensal.</p>
</div>

<?php require_once __DIR__ . '/includes/footer.php'; ?>
