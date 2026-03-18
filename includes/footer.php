        </div>
    </main>

    <!-- Script Global -->
    <script>
        // Lê o titulo embutido pelo componente da página e atualiza o Header principal (efeito SPA-like)
        document.addEventListener('DOMContentLoaded', () => {
            const titleMeta = document.querySelector('[data-page-title]');
            if (titleMeta) {
                const titleText = titleMeta.getAttribute('data-page-title');
                document.getElementById('page-title').innerText = titleText;
                document.title = titleText + " - Ótica Lis ERP";
            }
        });
    </script>
</body>
</html>
