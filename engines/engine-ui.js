/* ==========================================
   ENGINE 2: USER INTERFACE
   ========================================== */
const UIEngine = {
    init: function() {
        const d    = ConfigEngine.data;
        const sqft = d.width * d.depth;

        document.getElementById('ui-address').innerText      = d.address;
        document.getElementById('header-ui-apn').innerText   = d.apn;
        document.getElementById('ui-zoning').innerText  = d.zoning;
        document.getElementById('ui-w').innerText       = d.width;
        document.getElementById('ui-d').innerText       = d.depth;
        document.getElementById('ui-sqft').innerText    = sqft.toLocaleString() + ' SF';

        document.getElementById('info-address').innerText = d.address;
        document.getElementById('info-apn').innerText     = d.apn;
        document.getElementById('info-zone').innerText    = d.zoning;
        document.getElementById('info-w').innerText       = d.width.toFixed(1) + ' FT';

        this.updateLotSizeDisplay();
        document.getElementById('info-density-lot').innerText   = sqft.toFixed(1) + " S.F.";
        document.getElementById('info-buildable-far').innerText = (sqft * 2.0).toFixed(1) + " S.F.";

        document.getElementById('unitToggleBtn').addEventListener('click', (e) => {
            ConfigEngine.state.unitMode = ConfigEngine.state.unitMode === 'SF' ? 'AC' : 'SF';
            e.target.innerText = ConfigEngine.state.unitMode;
            this.updateLotSizeDisplay();
        });

        this.initBannerDrag();
    },

    updateLotSizeDisplay: function() {
        const sqft = ConfigEngine.data.width * ConfigEngine.data.depth;
        const el   = document.getElementById('info-lotsize');
        el.innerText = ConfigEngine.state.unitMode === 'SF'
            ? sqft.toFixed(1) + " S.F."
            : (sqft / 43560).toFixed(3) + " AC";
    },

    initBannerDrag: function() {
        const banner = document.getElementById('propertyBanner');
        let dragSrc    = null;
        let mergeTimer = null;
        let mergePending = null;
        const self = this;

        function clearMergeState() {
            clearTimeout(mergeTimer);
            mergeTimer = null;
            mergePending = null;
            banner.querySelectorAll('.banner-stat').forEach(s => {
                s.classList.remove('drag-over');
                s.classList.remove('merge-ready');
            });
        }

        function attachHandlers(el) {
            if (el.dataset.dragInit) return;
            el.dataset.dragInit = '1';

            el.addEventListener('dragstart', function(e) {
                dragSrc = this;
                this.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                const ghost = new Image();
                ghost.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=';
                e.dataTransfer.setDragImage(ghost, 0, 0);
            });
            el.addEventListener('dragend', function() {
                this.classList.remove('dragging');
                clearMergeState();
            });
            el.addEventListener('dragover', function(e) {
                e.preventDefault();
                if (this === dragSrc) return;
                e.dataTransfer.dropEffect = 'move';
                // New target — reset timer
                if (mergePending !== this) {
                    clearMergeState();
                    mergePending = this;
                    this.classList.add('drag-over');
                    // After 700 ms hover = merge mode
                    mergeTimer = setTimeout(() => {
                        if (mergePending === this) {
                            this.classList.remove('drag-over');
                            this.classList.add('merge-ready');
                        }
                    }, 700);
                }
            });
            el.addEventListener('drop', function(e) {
                e.stopPropagation();
                if (!dragSrc || dragSrc === this) { clearMergeState(); return; }

                if (this.classList.contains('merge-ready')) {
                    self.mergeCells(dragSrc, this);
                } else {
                    const all = [...banner.querySelectorAll('.banner-stat')];
                    if (all.indexOf(dragSrc) < all.indexOf(this))
                        banner.insertBefore(dragSrc, this.nextSibling);
                    else
                        banner.insertBefore(dragSrc, this);
                }
                clearMergeState();
            });
        }

        banner.querySelectorAll('.banner-stat').forEach(attachHandlers);

        // Double-click a merged cell to split it
        banner.addEventListener('dblclick', function(e) {
            const merged = e.target.closest('.banner-stat.merged');
            if (merged) self.splitCell(merged);
        });
    },

    mergeCells: function(src, target) {
        const banner = document.getElementById('propertyBanner');

        const merged = document.createElement('div');
        merged.className = 'banner-stat merged';
        merged.draggable = true;

        const half1 = document.createElement('div');
        half1.className = 'merge-half';
        while (src.firstChild) half1.appendChild(src.firstChild);

        const sep = document.createElement('div');
        sep.className = 'merge-sep';

        const half2 = document.createElement('div');
        half2.className = 'merge-half';
        while (target.firstChild) half2.appendChild(target.firstChild);

        merged.appendChild(half1);
        merged.appendChild(sep);
        merged.appendChild(half2);

        banner.insertBefore(merged, src);
        banner.removeChild(src);
        banner.removeChild(target);

        // Re-init to attach handlers to the new merged cell
        delete merged.dataset.dragInit;
        this.initBannerDrag();
    },

    splitCell: function(merged) {
        const banner = document.getElementById('propertyBanner');
        const halves = [...merged.querySelectorAll('.merge-half')];

        halves.forEach(half => {
            const stat = document.createElement('div');
            stat.className = 'banner-stat';
            stat.draggable = true;
            while (half.firstChild) stat.appendChild(half.firstChild);
            banner.insertBefore(stat, merged);
        });

        banner.removeChild(merged);
        this.initBannerDrag();
    }
};
