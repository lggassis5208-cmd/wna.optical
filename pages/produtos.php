<?php
require_once __DIR__ . '/../includes/config.php';
$base_url = '../';

$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = $_POST['name'] ?? '';
    $sku = $_POST['sku'] ?? '';
    // Format input string if user typed commas instead of float dots
    $price = (float)str_replace(',', '.', $_POST['price'] ?? 0);
    $ncm = preg_replace('/\D/', '', $_POST['ncm'] ?? '');
    $cest = preg_replace('/\D/', '', $_POST['cest'] ?? '');
    $stock = (int)($_POST['stock'] ?? 0);

    try {
        if(isset($pdo)){
            $stmt = $pdo->prepare("INSERT INTO products (name, sku, price, ncm, cest, stock) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->execute([$name, $sku, $price, $ncm, $cest, $stock]);
            $message = "Produto cadastrado com sucesso.";
        }
    } catch (PDOException $e) {
        $message = "Erro ao cadastrar produto: " . $e->getMessage();
    }
}

// Fetch products
$products = [];
try {
    if(isset($pdo)){
        $stmt = $pdo->query("SELECT * FROM products ORDER BY created_at DESC LIMIT 50");
        $products = $stmt->fetchAll();
    }
} catch (Exception $e) {}

require_once __DIR__ . '/../includes/header.php';
?>

<div data-page-title="Estoque / SEFAZ"></div>

<div class="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
    <div>
        <h1 class="text-3xl font-bold text-gray-100 mb-2">Armações e Lentes</h1>
        <p class="text-gray-400">Controle de estoque de mercadorias e seus atributos fiscais (NCM/CEST para GO).</p>
    </div>
    <button onclick="document.getElementById('modal-produto').classList.remove('hidden')" class="bg-brand-gold hover:bg-brand-goldHover text-brand-bg font-bold py-3 px-6 rounded-lg transition-all shadow-[0_0_15px_rgba(234,179,8,0.2)] hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] flex items-center gap-2 transform hover:-translate-y-0.5">
        <svg class="w-5 h-5 opacity-90" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
        Adicionar Mercadoria
    </button>
</div>

<?php if ($message): ?>
    <div class="mb-6 p-4 bg-gray-800/50 border border-brand-border rounded-xl text-gray-200">
        <?= htmlspecialchars($message) ?>
    </div>
<?php endif; ?>

<!-- Empty State / Tabela -->
<div class="bg-brand-surface border border-brand-border rounded-xl shadow-xl overflow-hidden mt-4">
    <table class="w-full text-left border-collapse whitespace-nowrap">
        <thead>
            <tr class="bg-brand-bg/80 text-gray-500 text-xs uppercase tracking-wider font-semibold border-b border-brand-border">
                <th class="p-4 px-6">SKU / Ref</th>
                <th class="p-4">Descrição da Mercadoria</th>
                <th class="p-4 text-center">NCM<span class="opacity-50 ml-1">Fisco</span></th>
                <th class="p-4 text-center">CEST</th>
                <th class="p-4 text-right">Preço Venda</th>
                <th class="p-4 text-center px-6">Estoque Alocado</th>
            </tr>
        </thead>
        <tbody class="divide-y divide-brand-border/50 text-sm">
            <?php foreach ($products as $p): ?>
            <tr class="hover:bg-brand-border/20 transition-colors group">
                <td class="p-4 px-6 text-brand-gold font-mono font-medium"><?= htmlspecialchars($p['sku']) ?></td>
                <td class="p-4 text-gray-200 font-medium">
                    <?= htmlspecialchars($p['name']) ?>
                </td>
                <td class="p-4 text-center font-mono text-gray-400">
                    <?= htmlspecialchars(substr($p['ncm'], 0,4).'.'.substr($p['ncm'], 4,2).'.'.substr($p['ncm'], 6,2)) ?>
                </td>
                <td class="p-4 text-center font-mono text-gray-500">
                    <?= htmlspecialchars($p['cest'] ? substr($p['cest'], 0,2).'.'.substr($p['cest'], 2,3).'.'.substr($p['cest'], 5,2) : 'N/A') ?>
                </td>
                <td class="p-4 text-right text-gray-200 font-medium">R$ <?= number_format($p['price'], 2, ',', '.') ?></td>
                <td class="p-4 px-6 text-center">
                    <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold <?= $p['stock'] > 0 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-500 border border-red-500/20' ?>">
                        <?= $p['stock'] ?> un
                    </span>
                </td>
            </tr>
            <?php endforeach; ?>
            <?php if (empty($products)): ?>
            <tr>
                <td colspan="6" class="p-16 text-center text-gray-500">
                    <svg class="w-16 h-16 mx-auto mb-4 opacity-30 text-brand-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path></svg>
                    Nenhum produto em estoque.<br>
                    <span class="text-xs opacity-70">Utilize o botão Adicionar Mercadoria para começar.</span>
                </td>
            </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>

<!-- Modal Criação -->
<div id="modal-produto" class="hidden fixed inset-0 bg-brand-bg/90 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity">
    <div class="bg-brand-surface border border-brand-border rounded-xl w-full max-w-2xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
        <div class="absolute -top-[1px] -left-[1px] w-1/3 h-[2px] bg-gradient-to-r from-brand-gold to-transparent"></div>
        
        <div class="flex justify-between items-center mb-8">
            <h2 class="text-2xl font-bold text-gray-100 flex items-center gap-3">
                <span class="w-8 h-8 rounded bg-brand-border flex items-center justify-center text-brand-gold">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </span>
                Cadastrar Mercadoria
            </h2>
            <button type="button" onclick="document.getElementById('modal-produto').classList.add('hidden')" class="text-gray-500 hover:text-white transition-colors bg-brand-bg rounded-lg p-2">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
        </div>
        
        <form method="POST" action="" class="space-y-5">
            <div class="grid grid-cols-2 gap-5 text-sm">
                <div class="col-span-2">
                    <label class="block text-gray-400 mb-1.5 font-medium">Nome / Descrição do Produto</label>
                    <input type="text" name="name" required class="w-full bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-gray-200 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold focus:outline-none transition-shadow placeholder-gray-600" placeholder="Ex: Armação Acetato Vermelha">
                </div>
                <div>
                    <label class="block text-gray-400 mb-1.5 font-medium">SKU / Código</label>
                    <input type="text" name="sku" required class="w-full bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-brand-gold font-mono focus:border-brand-gold focus:ring-1 focus:ring-brand-gold focus:outline-none transition-shadow uppercase" placeholder="ACET-VER-001">
                </div>
                <div>
                    <label class="block text-gray-400 mb-1.5 font-medium">Preço Base (R$)</label>
                    <input type="number" step="0.01" name="price" required class="w-full bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-gray-200 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold focus:outline-none transition-shadow" placeholder="299.90">
                </div>
                <div class="col-span-2 border-t border-brand-border mt-2 pt-5">
                    <p class="text-xs uppercase tracking-widest text-brand-gold mb-3 font-semibold">Tributação SEFAZ</p>
                </div>
                <div>
                    <label class="block text-gray-400 mb-1.5 font-medium">NCM</label>
                    <input type="text" name="ncm" placeholder="9004.90.10" maxlength="8" required class="w-full bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-gray-200 font-mono focus:border-brand-gold focus:ring-1 focus:ring-brand-gold focus:outline-none transition-shadow">
                </div>
                <div>
                    <label class="block text-gray-400 mb-1.5 font-medium">CEST <span class="text-xs opacity-50">(Opcional)</span></label>
                    <input type="text" name="cest" maxlength="7" placeholder="0000000" class="w-full bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-gray-200 font-mono focus:border-brand-gold focus:ring-1 focus:ring-brand-gold focus:outline-none transition-shadow">
                </div>
                <div class="col-span-2 pt-2">
                    <label class="block text-gray-400 mb-1.5 font-medium">Inventário Inicial (QTD)</label>
                    <input type="number" name="stock" value="1" required class="w-32 bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-center text-xl font-bold text-gray-200 focus:border-brand-gold focus:ring-1 focus:ring-brand-gold focus:outline-none transition-shadow">
                </div>
            </div>
            
            <div class="pt-6 mt-6 flex justify-end gap-4 border-t border-brand-border">
                <button type="button" onclick="document.getElementById('modal-produto').classList.add('hidden')" class="px-6 py-3 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-brand-border font-medium transition-colors">Cancelar</button>
                <button type="submit" class="px-8 py-3 rounded-lg bg-brand-gold text-brand-bg font-bold hover:bg-brand-goldHover focus:ring-2 focus:ring-offset-2 focus:ring-offset-brand-surface focus:ring-brand-gold transition-all shadow-lg flex items-center gap-2">
                    <svg class="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                    Confirmar Salvamento
                </button>
            </div>
        </form>
    </div>
</div>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
