// ============================================
// APPLICATION SUIVI 40m HAIES
// ============================================

// BARÈMES DE MAÎTRISE
const BAREMES = {
    1: {
        label: 'Niveau 1',
        times: [
            { min: 0, max: 7.99, mastery: 'excellent', label: 'Excellent' },
            { min: 8.00, max: 8.49, mastery: 'good', label: 'Bon' },
            { min: 8.50, max: 9.49, mastery: 'average', label: 'Moyen' },
            { min: 9.50, max: 999, mastery: 'needs_work', label: 'À améliorer' }
        ]
    },
    2: {
        label: 'Niveau 2',
        times: [
            { min: 0, max: 7.49, mastery: 'excellent', label: 'Excellent' },
            { min: 7.50, max: 8.29, mastery: 'good', label: 'Bon' },
            { min: 8.30, max: 9.29, mastery: 'average', label: 'Moyen' },
            { min: 9.30, max: 999, mastery: 'needs_work', label: 'À améliorer' }
        ]
    }
};

class PerformanceApp {
    constructor() {
        this.storageKey = 'haiesData';
        this.performances = this.loadData();
        this.currentTime = 0;
        this.chronoInterval = null;
        this.isRunning = false;
        this.currentLevel = null;
        this.init();
    }

    // ============================================
    // GESTION DU STOCKAGE LOCAL
    // ============================================

    loadData() {
        const saved = localStorage.getItem(this.storageKey);
        return saved ? JSON.parse(saved) : [];
    }

    saveData() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.performances));
    }

    // ============================================
    // INITIALISATION
    // ============================================

    init() {
        this.setupEventListeners();
        this.setTodayDate();
        this.displayData();
        this.updateTotalCount();
    }

    setupEventListeners() {
        // Export
        document.getElementById('exportCSVBtn').addEventListener('click', () => this.exportToCSV());
        document.getElementById('exportJSONBtn').addEventListener('click', () => this.exportToJSON());

        // Suppression
        document.getElementById('deleteAllBtn').addEventListener('click', () => this.showDeleteConfirm());

        // Filtres
        document.getElementById('filterClass').addEventListener('change', () => this.displayData());
        document.getElementById('filterStudent').addEventListener('change', () => this.displayData());
        document.getElementById('filterLevel').addEventListener('change', () => this.displayData());
    }

    setTodayDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    // ============================================
    // GESTION DU PROFIL ÉLÈVE
    // ============================================

    selectLevel(level) {
        this.currentLevel = level;
        document.getElementById('selectedLevel').value = level;

        // Mise à jour des boutons
        document.getElementById('levelBtn1').classList.toggle('selected', level === 1);
        document.getElementById('levelBtn2').classList.toggle('selected', level === 2);

        // Afficher le barème
        this.displayBareme();
    }

    displayBareme() {
        const container = document.getElementById('baremeContainer');
        const bareme = BAREMES[this.currentLevel];

        if (!bareme) return;

        // Mettre à jour le label
        document.getElementById('levelLabel').textContent = `Barème d'évaluation - ${bareme.label}`;
        document.getElementById('levelLabel').className = `level-label level-${this.currentLevel}`;

        // Remplir le tableau
        const tbody = document.getElementById('baremeBody');
        tbody.innerHTML = '';

        bareme.times.forEach(row => {
            const tr = document.createElement('tr');
            const timeLabel = row.max === 999 ? `> ${row.min}s` : `${row.min}s - ${row.max}s`;
            
            tr.innerHTML = `
                <td><strong>${timeLabel}</strong></td>
                <td><span class="mastery-level mastery-${row.mastery}">${row.label}</span></td>
            `;
            tbody.appendChild(tr);
        });

        container.style.display = 'block';
    }

    // ============================================
    // GESTION DU CHRONOMÈTRE
    // ============================================

    startChronometer() {
        if (this.isRunning) return;

        this.isRunning = true;
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;

        const startTime = Date.now() - (this.currentTime * 1000);

        this.chronoInterval = setInterval(() => {
            this.currentTime = (Date.now() - startTime) / 1000;
            document.getElementById('chronoDisplay').textContent = this.currentTime.toFixed(2) + 's';
            this.updateMasteryResult();
        }, 10);
    }

    stopChronometer() {
        if (!this.isRunning) return;

        this.isRunning = false;
        clearInterval(this.chronoInterval);

        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('saveBtn').disabled = false;

        this.updateMasteryResult();
    }

    resetChronometer() {
        this.currentTime = 0;
        this.isRunning = false;
        clearInterval(this.chronoInterval);

        document.getElementById('chronoDisplay').textContent = '0.00s';
        document.getElementById('startBtn').disabled = false;
        document.getElementById('stopBtn').disabled = true;
        document.getElementById('saveBtn').disabled = true;
        document.getElementById('masteryResult').textContent = '';
    }

    // ============================================
    // ÉVALUATION DE LA MAÎTRISE
    // ============================================

    updateMasteryResult() {
        if (!this.currentLevel) return;

        const bareme = BAREMES[this.currentLevel];
        const result = bareme.times.find(r => this.currentTime >= r.min && this.currentTime < r.max);

        if (result) {
            const masteryClass = `mastery-${result.mastery}`;
            document.getElementById('masteryResult').innerHTML = `
                <strong>Niveau de maîtrise détecté:</strong><br>
                <span class="mastery-level ${masteryClass}">${result.label}</span>
            `;
        }
    }

    // ============================================
    // ENREGISTREMENT DE LA PERFORMANCE
    // ============================================

    savePerformance() {
        const firstName = document.getElementById('studentFirstName').value.trim();
        const lastName = document.getElementById('studentLastName').value.trim();
        const studentClass = document.getElementById('studentClass').value;
        const level = parseInt(document.getElementById('selectedLevel').value);
        const date = document.getElementById('date').value;

        if (!firstName || !lastName || !studentClass || !level || !date) {
            this.showError('Veuillez remplir tous les champs du profil élève');
            return;
        }

        if (this.currentTime === 0) {
            this.showError('Veuillez enregistrer un temps avec le chronomètre');
            return;
        }

        // Déterminer le niveau de maîtrise
        const bareme = BAREMES[level];
        const masteryInfo = bareme.times.find(r => this.currentTime >= r.min && this.currentTime < r.max);

        const performance = {
            id: Date.now(),
            firstName,
            lastName,
            fullName: `${firstName} ${lastName}`,
            studentClass,
            level,
            time: this.currentTime,
            mastery: masteryInfo.mastery,
            masteryLabel: masteryInfo.label,
            date,
            timestamp: new Date().toISOString()
        };

        this.performances.push(performance);
        this.saveData();
        this.showSuccess('Performance enregistrée avec succès!');

        // Réinitialiser le formulaire
        this.resetForm();
        this.displayData();
        this.updateTotalCount();
    }

    resetForm() {
        document.getElementById('studentForm').reset();
        this.resetChronometer();
        this.currentLevel = null;
        document.getElementById('selectedLevel').value = '';
        document.getElementById('levelBtn1').classList.remove('selected');
        document.getElementById('levelBtn2').classList.remove('selected');
        document.getElementById('baremeContainer').style.display = 'none';
        document.getElementById('masteryResult').textContent = '';
        this.setTodayDate();
    }

    // ============================================
    // AFFICHAGE DES DONNÉES
    // ============================================

    displayData() {
        const filterClass = document.getElementById('filterClass').value;
        const filterStudent = document.getElementById('filterStudent').value;
        const filterLevel = document.getElementById('filterLevel').value;

        let filtered = this.performances;

        if (filterClass) {
            filtered = filtered.filter(p => p.studentClass === filterClass);
        }

        if (filterStudent) {
            filtered = filtered.filter(p => p.fullName === filterStudent);
        }

        if (filterLevel) {
            filtered = filtered.filter(p => p.level === parseInt(filterLevel));
        }

        // Trier par date décroissante
        filtered.sort((a, b) => new Date(b.date) - new Date(a.date));

        this.updateFilterOptions(filterClass);
        this.displayStats(filtered);
        this.displayTable(filtered);
    }

    updateFilterOptions(selectedClass) {
        const filterStudent = document.getElementById('filterStudent');
        const currentValue = filterStudent.value;

        let students = [...new Set(this.performances.map(p => p.fullName))].sort();

        if (selectedClass) {
            students = students.filter(name => 
                this.performances.some(p => p.fullName === name && p.studentClass === selectedClass)
            );
        }

        filterStudent.innerHTML = '<option value="">-- Tous les élèves --</option>';
        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student;
            option.textContent = student;
            filterStudent.appendChild(option);
        });

        // Restaurer la sélection si elle existe
        if (currentValue && students.includes(currentValue)) {
            filterStudent.value = currentValue;
        }
    }

    displayStats(data) {
        const container = document.getElementById('statsContainer');

        if (data.length === 0) {
            container.innerHTML = '<div class="no-data"><p>Aucune donnée</p></div>';
            return;
        }

        const times = data.map(p => p.time);
        const bestTime = Math.min(...times);
        const avgTime = (times.reduce((a, b) => a + b, 0) / times.length).toFixed(2);
        const totalPerformances = data.length;

        // Compter les niveaux de maîtrise
        const masteryCount = {
            excellent: data.filter(p => p.mastery === 'excellent').length,
            good: data.filter(p => p.mastery === 'good').length,
            average: data.filter(p => p.mastery === 'average').length,
            needs_work: data.filter(p => p.mastery === 'needs_work').length
        };

        container.innerHTML = `
            <div class="stats">
                <div class="stat-card">
                    <h3>Nombre de performances</h3>
                    <div class="value">${totalPerformances}</div>
                </div>
                <div class="stat-card best">
                    <h3>Meilleur temps</h3>
                    <div class="value">${bestTime.toFixed(2)}s</div>
                </div>
                <div class="stat-card">
                    <h3>Temps moyen</h3>
                    <div class="value">${avgTime}s</div>
                </div>
            </div>
            <div style="background: white; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <h4 style="color: #667eea; margin-bottom: 10px;">Répartition des niveaux de maîtrise</h4>
                <div style="font-size: 0.9em; line-height: 1.8;">
                    <p>🏆 Excellent: <strong>${masteryCount.excellent}</strong></p>
                    <p>✅ Bon: <strong>${masteryCount.good}</strong></p>
                    <p>⚠️ Moyen: <strong>${masteryCount.average}</strong></p>
                    <p>❌ À améliorer: <strong>${masteryCount.needs_work}</strong></p>
                </div>
            </div>
        `;
    }

    displayTable(data) {
        const container = document.getElementById('tableContainer');

        if (data.length === 0) {
            container.innerHTML = '<div class="no-data"><p>Aucune performance à afficher</p></div>';
            return;
        }

        let html = `
            <table>
                <thead>
                    <tr>
                        <th>Élève</th>
                        <th>Classe</th>
                        <th>Niveau</th>
                        <th>Temps (s)</th>
                        <th>Maîtrise</th>
                        <th>Date</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
        `;

        data.forEach(perf => {
            const dateFormatted = this.formatDate(perf.date);
            const masteryClass = `mastery-${perf.mastery}`;
            const levelLabel = `Niveau ${perf.level}`;
            
            html += `
                <tr>
                    <td><strong>${this.escapeHtml(perf.fullName)}</strong></td>
                    <td>${perf.studentClass}</td>
                    <td>${levelLabel}</td>
                    <td><strong>${perf.time.toFixed(2)}</strong></td>
                    <td><span class="mastery-level ${masteryClass}">${perf.masteryLabel}</span></td>
                    <td>${dateFormatted}</td>
                    <td class="delete-row" onclick="app.deletePerformance(${perf.id})">🗑️</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    // ============================================
    // SUPPRESSION
    // ============================================

    deletePerformance(id) {
        this.performances = this.performances.filter(p => p.id !== id);
        this.saveData();
        this.displayData();
        this.updateTotalCount();
        this.showSuccess('Performance supprimée');
    }

    showDeleteConfirm() {
        if (this.performances.length === 0) {
            this.showError('Aucune donnée à supprimer');
            return;
        }
        document.getElementById('confirmModal').classList.add('active');
    }

    updateTotalCount() {
        document.getElementById('totalCount').textContent = this.performances.length;
    }

    // ============================================
    // EXPORT CSV
    // ============================================

    exportToCSV() {
        if (this.performances.length === 0) {
            this.showError('Aucune donnée à exporter');
            return;
        }

        const filterClass = document.getElementById('filterClass').value;
        const filterStudent = document.getElementById('filterStudent').value;
        const filterLevel = document.getElementById('filterLevel').value;

        let toExport = this.performances;

        if (filterClass) {
            toExport = toExport.filter(p => p.studentClass === filterClass);
        }

        if (filterStudent) {
            toExport = toExport.filter(p => p.fullName === filterStudent);
        }

        if (filterLevel) {
            toExport = toExport.filter(p => p.level === parseInt(filterLevel));
        }

        if (toExport.length === 0) {
            this.showError('Aucune donnée à exporter avec les filtres sélectionnés');
            return;
        }

        const headers = ['Prénom', 'Nom', 'Classe', 'Niveau', 'Temps (s)', 'Maîtrise', 'Date'];
        const rows = toExport.map(p => [
            p.firstName,
            p.lastName,
            p.studentClass,
            p.level,
            p.time.toFixed(2),
            p.masteryLabel,
            p.date
        ]);

        let csv = this.convertToCSV(headers, rows);

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const date = new Date().toISOString().split('T')[0];
        const filename = `haies_performances_${date}.csv`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showSuccess(`Export réussi: ${filename}`);
    }

    // ============================================
    // EXPORT JSON
    // ============================================

    exportToJSON() {
        if (this.performances.length === 0) {
            this.showError('Aucune donnée à exporter');
            return;
        }

        const filterClass = document.getElementById('filterClass').value;
        const filterStudent = document.getElementById('filterStudent').value;
        const filterLevel = document.getElementById('filterLevel').value;

        let toExport = this.performances;

        if (filterClass) {
            toExport = toExport.filter(p => p.studentClass === filterClass);
        }

        if (filterStudent) {
            toExport = toExport.filter(p => p.fullName === filterStudent);
        }

        if (filterLevel) {
            toExport = toExport.filter(p => p.level === parseInt(filterLevel));
        }

        if (toExport.length === 0) {
            this.showError('Aucune donnée à exporter avec les filtres sélectionnés');
            return;
        }

        const data = {
            exportDate: new Date().toISOString(),
            totalRecords: toExport.length,
            performances: toExport
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        const date = new Date().toISOString().split('T')[0];
        const filename = `haies_performances_${date}.json`;

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        this.showSuccess(`Export réussi: ${filename}`);
    }

    convertToCSV(headers, rows) {
        let csv = headers.join(';') + '\n';
        
        rows.forEach(row => {
            csv += row.map(cell => {
                const escaped = String(cell).replace(/"/g, '""');
                return escaped.includes(';') || escaped.includes('\n') ? `"${escaped}"` : escaped;
            }).join(';') + '\n';
        });

        return csv;
    }

    // ============================================
    // MESSAGES ET UTILITAIRES
    // ============================================

    showSuccess(message) {
        const elem = document.getElementById('successMsg');
        elem.textContent = message;
        elem.style.display = 'block';
        setTimeout(() => {
            elem.style.display = 'none';
        }, 3000);
    }

    showError(message) {
        const elem = document.getElementById('errorMsg');
        elem.textContent = message;
        elem.style.display = 'block';
        setTimeout(() => {
            elem.style.display = 'none';
        }, 3000);
    }

    formatDate(dateString) {
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString + 'T00:00:00').toLocaleDateString('fr-FR', options);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// ============================================
// GESTION DES ONGLETS
// ============================================

function switchTab(tabName) {
    // Cacher tous les contenus
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });

    // Désactiver tous les boutons
    document.querySelectorAll('.tab-button').forEach(el => {
        el.classList.remove('active');
    });

    // Afficher le contenu actif
    document.getElementById(tabName).classList.add('active');

    // Activer le bouton correspondant
    event.target.classList.add('active');
}

// ============================================
// FONCTIONS GLOBALES
// ============================================

let app;

document.addEventListener('DOMContentLoaded', () => {
    app = new PerformanceApp();
});

function closeModal() {
    document.getElementById('confirmModal').classList.remove('active');
}

function confirmDelete() {
    app.performances = [];
    app.saveData();
    app.displayData();
    app.updateTotalCount();
    closeModal();
    app.showSuccess('Toutes les données ont été supprimées');
}

// Fermer le modal en cliquant en dehors
window.addEventListener('click', (event) => {
    const modal = document.getElementById('confirmModal');
    if (event.target === modal) {
        closeModal();
    }
});

// Fonctions globales pour le chronomètre
function startChronometer() {
    app.startChronometer();
}

function stopChronometer() {
    app.stopChronometer();
}

function resetChronometer() {
    app.resetChronometer();
}

function selectLevel(level) {
    app.selectLevel(level);
}

function savePerformance() {
    app.savePerformance();
}
