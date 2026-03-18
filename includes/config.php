<?php
$db_host = 'localhost';
$db_user = 'root'; // Ajuste com seu usuario do MySQL local
$db_pass = '';     // Ajuste com sua senha do MySQL local, se houver
$db_name = 'otica_lis';

try {
    // Tenta conectar; em ambiente de dev o DB pode nao existir inicialmente
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    if (strpos($e->getMessage(), 'Unknown database') !== false) {
        try {
            $pdo_init = new PDO("mysql:host=$db_host;charset=utf8", $db_user, $db_pass);
            $pdo_init->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo_init->exec("CREATE DATABASE IF NOT EXISTS `$db_name`");
            $pdo_init->exec("USE `$db_name`");
            
            // Auto-executa o schema limitadamente para facilitar o setup
            $schema = file_get_contents(__DIR__ . '/../db/schema.sql');
            if ($schema) {
                // Roda o SQL
                $pdo_init->exec($schema);
            }
            $pdo = clone $pdo_init;
        } catch (PDOException $e2) {
            die("Erro de conexao / criacao do BD: " . $e2->getMessage());
        }
    } else {
        die("Erro de conexao com Banco de Dados: " . $e->getMessage());
    }
}
?>
