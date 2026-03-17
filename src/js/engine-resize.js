/* ==========================================
   ENGINE 6: COLUMN RESIZE
   ========================================== */
const ResizeEngine = {
    init: function() {
        const divider    = document.getElementById('colDivider');
        const sidebar    = document.getElementById('sidebarPanel');
        const infoLeft   = document.getElementById('infoColLeft');
        let isResizing = false, startX, startW;

        // Sync info-bottom left column to current sidebar width
        function syncInfo(w) { if (infoLeft) infoLeft.style.width = w + 'px'; }
        syncInfo(sidebar.offsetWidth);

        divider.addEventListener('mousedown', function(e) {
            isResizing = true; startX = e.clientX; startW = sidebar.offsetWidth;
            divider.classList.add('resizing');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
            e.preventDefault();
        });
        document.addEventListener('mousemove', function(e) {
            if (!isResizing) return;
            const newW = Math.max(240, Math.min(700, startW + (e.clientX - startX)));
            sidebar.style.width = newW + 'px';
            syncInfo(newW);
            if (MapEngine.map) MapEngine.map.invalidateSize();
        });
        document.addEventListener('mouseup', function() {
            if (isResizing) {
                isResizing = false;
                divider.classList.remove('resizing');
                document.body.style.cursor = '';
                document.body.style.userSelect = '';
            }
        });
    }
};

