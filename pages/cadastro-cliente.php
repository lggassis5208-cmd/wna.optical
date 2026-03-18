<?php
require_once __DIR__ . '/../includes/config.php';
$base_url = '../';

$message = '';
$message_type = ''; // success or error
$lis_score = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $name = $_POST['name'] ?? '';
    // Strip everything except numbers from CPF, CEP, Phone
    $cpf = preg_replace('/\D/', '', $_POST['cpf'] ?? '');
    $cep = preg_replace('/\D/', '', $_POST['cep'] ?? '');
    $address = $_POST['address'] ?? '';
    $neighborhood = $_POST['neighborhood'] ?? '';
    $city = $_POST['city'] ?? '';
    $state = $_POST['state'] ?? '';
    $phone = preg_replace('/\D/', '', $_POST['phone'] ?? '');

    // -- Lógica "Gemini 3" Simulada para Lis Score -- 
    // Em produção real, faria uma chamada cURL para a TGI/Vertex.
    $score = rand(650, 980); 
    $reason = "Análise IA (Simulação): Cliente apresenta bom histórico perante bureau. Probabilidade de default mínima.";
    
    // Regra simples para demonstrar penalidade no Score
    if (strlen($name) < 5 || strlen($cpf) !== 11) {
        $score = rand(300, 599);
        $reason = "Análise IA (Simulação): Dados limitados ou CPF incorreto. Alto risco identificado.";
    }

    try {
        $stmt = $pdo->prepare("INSERT INTO clients (name, cpf, cep, address, neighborhood, city, state, phone, lis_score, lis_score_reason) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
        $stmt->execute([$name, $cpf, $cep, $address, $neighborhood, $city, $state, $phone, $score, $reason]);
        
        $message = "Cliente «{$name}» cadastrado com sucesso! Lis Score Gerado.";
        $message_type = 'success';
        $lis_score = $score;
        $lis_reason = $reason;
    } catch (PDOException $e) {
        if ($e->getCode() == 23000) { // Constraint violation (Duplicate CPF)
            $message = "Erro: Este CPF já possui cadastro no sistema.";
            $message_type = 'error';
        } else {
            $message = "Erro de SGBD: " . $e->getMessage();
            $message_type = 'error';
        }
    }
}

require_once __DIR__ . '/../includes/header.php';
?>

<div data-page-title="Cadastro de Cliente"></div>

<div class="max-w-4xl mx-auto pb-12">
    <div class="mb-8 flex justify-between items-end">
        <div>
            <h1 class="text-3xl font-bold text-gray-100 mb-2">Novo Cliente</h1>
            <p class="text-gray-400">Preencha os dados primários para liberação de crédito (Lis Score).</p>
        </div>
        <?php if ($lis_score): ?>
        <div class="bg-brand-surface border <?= $lis_score >= 600 ? 'border-brand-gold shadow-[0_0_15px_rgba(234,179,8,0.2)]' : 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]' ?> rounded-xl p-4 text-center min-w-[200px]">
            <p class="text-xs text-gray-400 uppercase tracking-widest mb-1">IA Lis SCORE</p>
            <p class="text-4xl font-black <?= $lis_score >= 600 ? 'text-brand-gold' : 'text-red-500' ?>"><?= $lis_score ?></p>
        </div>
        <?php endif; ?>
    </div>

    <!-- Alert -->
    <?php if ($message): ?>
        <div class="mb-8 p-4 <?= $message_type === 'success' ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-red-900/30 border-red-500 text-red-400' ?> border rounded-xl flex items-start gap-4 shadow-lg">
            <svg class="w-6 h-6 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <div>
                <p class="font-bold"><?= htmlspecialchars($message) ?></p>
                <?php if (isset($lis_reason)): ?>
                    <p class="text-sm opacity-80 mt-1"><?= htmlspecialchars($lis_reason) ?></p>
                <?php endif; ?>
            </div>
        </div>
    <?php endif; ?>

    <div class="bg-brand-surface border border-brand-border rounded-xl p-8 shadow-xl">
        <form method="POST" action="" class="space-y-6">
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Nome -->
                <div class="col-span-2 md:col-span-1">
                    <label class="block text-sm font-medium text-gray-400 mb-1.5 focus-within:text-brand-gold transition-colors">Nome Completo</label>
                    <input type="text" name="name" required class="w-full bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all shadow-inner">
                </div>
                
                <!-- CPF -->
                <div class="col-span-2 md:col-span-1">
                    <label class="block text-sm font-medium text-gray-400 mb-1.5 focus-within:text-brand-gold transition-colors">CPF (Somente Números)</label>
                    <input type="text" name="cpf" maxlength="14" placeholder="000.000.000-00" required class="w-full bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all shadow-inner">
                </div>
            </div>

            <hr class="border-brand-border">

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- CEP -->
                <div class="col-span-2 md:col-span-1">
                    <label class="block text-sm font-medium text-gray-400 mb-1.5 focus-within:text-brand-gold transition-colors">CEP</label>
                    <div class="flex gap-3">
                        <input type="text" name="cep" id="cep" maxlength="9" placeholder="00000-000" required class="flex-1 bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all shadow-inner">
                        <button type="button" onclick="pesquisarCep()" class="bg-[#333333] hover:bg-[#4dd3] border border-brand-border hover:border-brand-gold px-6 rounded-lg text-sm text-gray-200 font-medium transition-all group">
                            <svg class="w-5 h-5 text-gray-400 group-hover:text-brand-gold inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        </button>
                    </div>
                </div>

                <!-- Telefone -->
                <div class="col-span-2 md:col-span-1">
                    <label class="block text-sm font-medium text-gray-400 mb-1.5 focus-within:text-brand-gold transition-colors">Telefone / WhatsApp</label>
                    <input type="text" name="phone" placeholder="(00) 90000-0000" required class="w-full bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all shadow-inner">
                </div>
                
                <!-- Endereço -->
                <div class="col-span-2">
                    <label class="block text-sm font-medium text-gray-400 mb-1.5 focus-within:text-brand-gold transition-colors">Logradouro / Endereço</label>
                    <input type="text" name="address" id="address" class="w-full bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all shadow-inner">
                </div>
                
                <!-- Bairro -->
                <div class="col-span-2 md:col-span-1">
                    <label class="block text-sm font-medium text-gray-400 mb-1.5 focus-within:text-brand-gold transition-colors">Bairro</label>
                    <input type="text" name="neighborhood" id="neighborhood" class="w-full bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all shadow-inner">
                </div>
                
                <!-- Cidade -->
                <div class="col-span-2 md:col-span-1 grid grid-cols-4 gap-4">
                    <div class="col-span-3">
                        <label class="block text-sm font-medium text-gray-400 mb-1.5 focus-within:text-brand-gold transition-colors">Cidade</label>
                        <input type="text" name="city" id="city" class="w-full bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all shadow-inner">
                    </div>
                    <div class="col-span-1">
                        <label class="block text-sm font-medium text-gray-400 mb-1.5 focus-within:text-brand-gold transition-colors">UF</label>
                        <input type="text" name="state" id="state" maxlength="2" class="w-full bg-[#141414] border border-brand-border rounded-lg px-4 py-3 text-gray-200 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold transition-all shadow-inner text-center uppercase">
                    </div>
                </div>
            </div>
            
            <div class="pt-6 border-t border-brand-border flex justify-end">
                <button type="submit" class="bg-brand-gold hover:bg-brand-goldHover text-brand-bg font-bold py-3.5 px-8 rounded-lg shadow-[0_0_15px_rgba(234,179,8,0.3)] transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                    <svg class="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    Cadastrar e Analisar Cliente (IA)
                </button>
            </div>
        </form>
    </div>
</div>

<script>
    function pesquisarCep() {
        let cepInput = document.getElementById('cep');
        let cep = cepInput.value.replace(/\D/g, '');
        
        if (cep != "") {
            let validacep = /^[0-9]{8}$/;
            if(validacep.test(cep)) {
                // Loading State
                cepInput.classList.add('opacity-50');
                
                document.getElementById('address').value = "Buscando...";
                document.getElementById('neighborhood').value = "Buscando...";
                document.getElementById('city').value = "Buscando...";
                document.getElementById('state').value = "..";

                let script = document.createElement('script');
                script.src = 'https://viacep.com.br/ws/'+ cep + '/json/?callback=meu_callback';
                document.body.appendChild(script);
            } else {
                alert("Formato de CEP inválido. Use apenas números.");
            }
        }
    }

    function meu_callback(conteudo) {
        document.getElementById('cep').classList.remove('opacity-50');
        if (!("erro" in conteudo)) {
            document.getElementById('address').value = (conteudo.logradouro);
            document.getElementById('neighborhood').value = (conteudo.bairro);
            document.getElementById('city').value = (conteudo.localidade);
            document.getElementById('state').value = (conteudo.uf);
        } else {
            alert("CEP não encontrado no sistema formador.");
            document.getElementById('address').value = "";
            document.getElementById('neighborhood').value = "";
            document.getElementById('city').value = "";
            document.getElementById('state').value = "";
        }
    }
</script>

<?php require_once __DIR__ . '/../includes/footer.php'; ?>
