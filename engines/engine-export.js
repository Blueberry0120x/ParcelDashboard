/* ==========================================
   ENGINE 5: EXPORT
   ========================================== */
const ExportEngine = {
    generateLISP: function() {
        const latlngs = MapEngine.lotPoly.getLatLngs()[0];
        proj4.defs(ConfigEngine.cad.projection, ConfigEngine.cad.proj4Def);

        let out = ";; ==========================================\n";
        out += ";; AUTOLISP BOUNDARY SCRIPT - " + ConfigEngine.data.apn + "\n";
        out += ";; Rotation Angle: " + ConfigEngine.state.rotation.toFixed(1) + " degrees\n";
        out += ";; System: CA State Plane Zone 6 (Intl Ft)\n";
        out += ";; ==========================================\n\n(command \"_pline\"\n";

        const ptNames = ["Pt 1 (Front Left)", "Pt 2 (Back Left)", "Pt 3 (Back Right)", "Pt 4 (Front Right)"];
        latlngs.forEach((pt, i) => {
            const ca = proj4("WGS84", ConfigEngine.cad.projection, [pt.lng, pt.lat]);
            out += "  \"" + ca[0].toFixed(4) + "," + ca[1].toFixed(4) + "\"   ;; " + ptNames[i] + "\n";
        });
        out += "  \"c\"\n)\n(command \"_zoom\" \"e\")\n(princ \"\\nLot Plotted.\")\n(princ)";
        document.getElementById('outputCoords').value = out;
    },

    exportImage: function() {
        html2canvas(document.getElementById('map'), { useCORS: true, allowTaint: false, backgroundColor: null })
            .then(canvas => {
                const link = document.createElement('a');
                link.download = `Vicinity_Map_${ConfigEngine.data.apn}.png`;
                link.href = canvas.toDataURL("image/png");
                link.click();
            })
            .catch(() => {
                alert("Image export blocked by tile server security. Use the Fullscreen button and take a screenshot instead.");
            });
    }
};
