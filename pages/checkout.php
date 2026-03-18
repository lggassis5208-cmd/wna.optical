<?php
require_once __DIR__ . '/../includes/config.php';
$base_url = '../';

// Lookups para a frente de caixa
$clients = [];
$products = [];
try {
    if(isset($pdo)) {
        // Ordena para que os melhores scores (clientes fiéis) apareçam facilmente no topo, ou alfabético
        $clients = $pdo->query("SELECT id, name, phone, lis_score FROM clients ORDER BY name")->fetchAll();
        $products = $pdo->query("SELECT id, name, sku, price, stock FROM products WHERE stock > 0 ORDER BY name")->fetchAll();
    }
} catch (Exception $e) {}

$wa_link = '';
$sale_success = false;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $client_id = $_POST['client_id'] ?? null;
    $product_id = $_POST['product_id'] ?? null;
    $payment_method = $_POST['payment_method'] ?? 'Pix';

    if ($client_id && $product_id && isset($pdo)) {
        try {
            // Logica básica de fechamento
            $stmt = $pdo->prepare("SELECT price, name FROM products WHERE id = ?");
            $stmt->execute([$product_id]);
            $prod = $stmt->fetch();
            $price = $prod['price'];
            $prod_name = $prod['name'];

            $pdo->beginTransaction();
            
            // Grava venda PAI
            $stmt = $pdo->prepare("INSERT INTO sales (client_id, total_amount, payment_method) VALUES (?, ?, ?)");
            $stmt->execute([$client_id, $price, $payment_method]);
            $sale_id = $pdo->lastInsertId();

            // Grava Ítems
            $stmt = $pdo->prepare("INSERT INTO sale_items (sale_id, product_id, quantity, unit_price) VALUES (?, ?, 1, ?)");
            $stmt->execute([$sale_id, $product_id, $price]);

            // Baixa no Estoque
            $stmt = $pdo->prepare("UPDATE products SET stock = stock - 1 WHERE id = ?");
            $stmt->execute([$product_id]);
            
            $pdo->commit();

            // Lógica WhatsApp (Gera Link)
            $stmt = $pdo->prepare("SELECT name, phone FROM clients WHERE id = ?");
            $stmt->execute([$client_id]);
            $client = $stmt->fetch();
            
            $phone = preg_replace('/\D/', '', $client['phone']);
            if (strlen($phone) >= 10) {
                // Monta mensagem premium 
                $first_name = explode(' ', trim($client['name']))[0];
                $valor_f = number_format($price, 2, ',', '.');
                $msg = "Olá, *{$first_name}*! Tudo bem?\n\nAgradecemos a preferência pela *Ótica Lis* 👓✨.\n\nSua compra de _«{$prod_name}»_ (Pedido #{$sale_id}) via {$payment_method} foi registrada com sucesso (R$ {$valor_f}).\n\nQualquer dúvida, nossa equipe está à disposição!";
                $wa_link = "https://wa.me/55{$phone}?text=" . urlencode($msg);
            }
            $sale_success = true;
        } catch (Exception $e) {
            $pdo->rollBack();
            $error = "Erro no PDV: " . $e->getMessage();
        }
    }
}

require_once __DIR__ . '/../includes/header.php';
?>

<div data-page-title="Frente de Caixa (PDV)"></div>

<div class="max-w-5xl mx-auto">
    <div class="mb-10 text-center">
        <h1 class="text-4xl font-extrabold text-brand-gold uppercase tracking-widest mb-2">Checkout</h1>
        <p class="text-gray-400">Finalização de venda com emissão de recibo digital automatizado via WhatsApp.</p>
    </div>

    <!-- Interface Sucesso -->
    <?php if ($sale_success): ?>
        <div class="bg-brand-surface border border-emerald-500/30 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.15)] relative overflow-hidden">
            <div class="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            
            <div class="p-12 text-center">
                <div class="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                    <div class="absolute inset-0 border-4 border-emerald-500 rounded-full animate-ping opacity-20"></div>
                    <svg class="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                
                <h2 class="text-3xl font-bold text-gray-100 mb-3">Transação Concluída</h2>
                <p class="text-gray-400 mb-10 max-w-md mx-auto">A venda foi registrada e o estoque do produto foi deduzido automaticamente no inventário.</p>
                
                <div class="flex flex-col sm:flex-row items-center justify-center gap-6">
                    <?php if ($wa_link): ?>
                    <a href="<?= $wa_link ?>" target="_blank" class="group relative inline-flex items-center justify-center gap-3 bg-[#25D366] hover:bg-[#1DA851] text-white font-bold py-4 px-8 rounded-xl shadow-lg shadow-[#25D366]/30 transition-all transform hover:-translate-y-1 w-full sm:w-auto overflow-hidden">
                        <div class="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
                        <svg class="w-6 h-6 relative z-10" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        <span class="relative z-10">Enviar Recibo WhatsApp</span>
                    </a>
                    <?php endif; ?>
                    
                    <a href="checkout.php" class="inline-flex items-center justify-center gap-2 bg-brand-bg border border-brand-border hover:border-brand-gold text-gray-300 hover:text-brand-gold font-bold py-4 px-8 rounded-xl transition-all w-full sm:w-auto">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
                        Nova Venda
                    </a>
                </div>
            </div>
        </div>

    <!-- Interface Padrao PDV -->
    <?php else: ?>
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2">
                <form method="POST" action="" id="checkout-form" class="bg-brand-surface border border-brand-border rounded-xl shadow-xl overflow-hidden p-8 space-y-8">
                    
                    <!-- Selecao de Cliente -->
                    <div>
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-8 h-8 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center font-bold">1</div>
                            <h2 class="text-xl font-bold text-gray-200">Sacado / Cliente</h2>
                        </div>
                        <div class="relative">
                            <select name="client_id" required class="w-full bg-[#141414] border border-brand-border rounded-xl px-5 py-4 text-gray-200 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold appearance-none text-lg">
                                <option value="">Busque na base de clientes...</option>
                                <?php foreach($clients as $c): ?>
                                    <option value="<?= $c['id'] ?>">
                                        <?= htmlspecialchars($c['name']) ?> 
                                        &#160;&#160;&#8212;&#160;&#160; 
                                        Reputação: <?= $c['lis_score'] ?>
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                        <?php if(empty($clients)): ?>
                            <p class="text-red-400 text-sm mt-2 font-medium">Você precisa cadastrar clientes primeiro.</p>
                        <?php endif; ?>
                    </div>
                    
                    <hr class="border-brand-border">

                    <!-- Selecao Produto -->
                    <div>
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-8 h-8 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center font-bold">2</div>
                            <h2 class="text-xl font-bold text-gray-200">Itens / Lentes / Armações</h2>
                        </div>
                        <div class="relative">
                            <select name="product_id" id="prod-select" onchange="updateSummary()" required class="w-full bg-[#141414] border border-brand-border rounded-xl px-5 py-4 text-gray-200 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold appearance-none text-lg">
                                <option value="" data-price="0">Escaneie o SKU ou selecione...</option>
                                <?php foreach($products as $p): ?>
                                    <option value="<?= $p['id'] ?>" data-price="<?= $p['price'] ?>">
                                        <?= htmlspecialchars($p['sku']) ?> - <?= htmlspecialchars($p['name']) ?> 
                                    </option>
                                <?php endforeach; ?>
                            </select>
                            <div class="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                        <?php if(empty($products)): ?>
                            <p class="text-red-400 text-sm mt-2 font-medium">Sem estoque disponível.</p>
                        <?php endif; ?>
                    </div>

                    <hr class="border-brand-border">

                    <!-- Meio Pagamento -->
                    <div>
                        <div class="flex items-center gap-3 mb-4">
                            <div class="w-8 h-8 rounded-full bg-brand-gold/10 text-brand-gold flex items-center justify-center font-bold">3</div>
                            <h2 class="text-xl font-bold text-gray-200">Forma de Pagamento</h2>
                        </div>
                        
                        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 custom-radio">
                            <label class="relative border-2 border-brand-border rounded-xl p-5 cursor-pointer hover:bg-brand-border/30 transition-all text-center focus-within:border-brand-gold group">
                                <input type="radio" name="payment_method" value="Pix" class="peer sr-only" checked>
                                <svg class="w-8 h-8 mx-auto mb-2 text-gray-400 peer-checked:text-brand-gold transition-colors" fill="currentColor" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M10.156 16.035L1.879 24.281l8.3 8.356c3.2 3.149 8.441 3.149 11.64 0l8.3-8.356-8.3-8.246c0 0-1.42 1.4-1.4 1.383 1.83 1.867 1.83 4.939 0 6.806l-6.86 6.86c-1.85 1.85-4.88 1.85-6.75 0l-6.83-6.81a4.845 4.845 0 010-6.85c1.86-1.87 1.86-1.87 6.85-6.81a4.836 4.836 0 016.81 0l1.45-1.42a6.83 6.83 0 00-9.64 0l-5.28 5.25v-.01zM21.9 15.904l8.22-8.204-8.22-8.242c-3.14-3.21-8.33-3.28-11.53-.13a1.085 1.085 0 00-.09.13L2.09 7.72 10.37 16c1.64-1.63 1.63-1.63 1.63-1.63a4.793 4.793 0 01-1.69-6.39 4.819 4.819 0 011.69-1.39l6.83-6.83a4.808 4.808 0 016.78 0l6.81 6.83c1.86 1.89 1.86 4.93 0 6.83l-6.83 6.85-3.69-3.71z"/></svg>
                                <span class="block text-gray-200 font-bold peer-checked:text-brand-gold transition-colors">Pix</span>
                                <div class="absolute inset-0 border-2 border-transparent peer-checked:border-brand-gold rounded-xl pointer-events-none transition-all shadow-[inset_0_0_15px_rgba(234,179,8,0.1)]"></div>
                            </label>
                            
                            <label class="relative border-2 border-brand-border rounded-xl p-5 cursor-pointer hover:bg-brand-border/30 transition-all text-center focus-within:border-brand-gold group">
                                <input type="radio" name="payment_method" value="Cartão de Crédito" class="peer sr-only">
                                <svg class="w-8 h-8 mx-auto mb-2 text-gray-400 peer-checked:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"></path></svg>
                                <span class="block text-gray-200 font-bold peer-checked:text-brand-gold transition-colors">Cartão Crédito</span>
                                <div class="absolute inset-0 border-2 border-transparent peer-checked:border-brand-gold rounded-xl pointer-events-none transition-all shadow-[inset_0_0_15px_rgba(234,179,8,0.1)]"></div>
                            </label>
                            
                            <label class="relative border-2 border-brand-border rounded-xl p-5 cursor-pointer hover:bg-brand-border/30 transition-all text-center focus-within:border-brand-gold group">
                                <input type="radio" name="payment_method" value="Boleto / Crediário" class="peer sr-only">
                                <svg class="w-8 h-8 mx-auto mb-2 text-gray-400 peer-checked:text-brand-gold transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                <span class="block text-gray-200 font-bold peer-checked:text-brand-gold transition-colors">Carnê Lis</span>
                                <div class="absolute inset-0 border-2 border-transparent peer-checked:border-brand-gold rounded-xl pointer-events-none transition-all shadow-[inset_0_0_15px_rgba(234,179,8,0.1)]"></div>
                            </label>
                        </div>
                    </div>
                </form>
            </div>

            <!-- Resumo Financeiro / Side Panel -->
            <div class="lg:col-span-1">
                <div class="bg-brand-bg/50 border border-brand-border rounded-xl shadow-xl sticky top-8">
                    <div class="p-6 border-b border-brand-border">
                        <h3 class="text-xl font-bold text-gray-100 mb-1">Resumo da Venda</h3>
                        <p class="text-sm text-gray-500 font-mono">PDV - Caixa Livre</p>
                    </div>
                    
                    <div class="p-6 space-y-4">
                        <div class="flex justify-between text-gray-400">
                            <span>Subtotal Itens</span>
                            <span class="font-mono text-gray-200" id="summary-subtotal">R$ 0,00</span>
                        </div>
                        <div class="flex justify-between text-gray-400">
                            <span>Desconto</span>
                            <span class="font-mono text-emerald-400">- R$ 0,00</span>
                        </div>
                        
                        <div class="border-t border-brand-border/80 pt-4 mt-6">
                            <div class="flex flex-col mb-6">
                                <span class="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Total a Pagar</span>
                                <span class="text-4xl font-black text-brand-gold" id="summary-total">R$ 0,00</span>
                            </div>
                            
                            <!-- Trigger Button to submit form outside of form tag -->
                            <button onclick="document.getElementById('checkout-form').submit()" class="w-full bg-brand-gold hover:bg-brand-goldHover text-brand-bg font-extrabold py-5 px-6 rounded-xl shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-all flex items-center justify-center gap-3 text-lg transform hover:-translate-y-1">
                                <svg class="w-6 h-6 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                Fechar Venda Seguro
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    <?php endif; ?>
</div>

<script>
    function updateSummary() {
        const select = document.getElementById('prod-select');
        const selectedOption = select.options[select.selectedIndex];
        const price = parseFloat(selectedOption.getAttribute('data-price') || 0);
        
        // Formatar para moeda br
        const formated = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
        document.getElementById('summary-subtotal').innerText = formated;
        document.getElementById('summary-total').innerText = formated;
    }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
