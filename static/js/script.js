// Variabel global untuk menyimpan hasil simulasi
let simulationResults = {};
let comparisonResults = {};

// Mengatur event listeners saat DOM siap
document.addEventListener('DOMContentLoaded', function() {
    // Update display nilai untuk slider
    setupSliderListeners();
    
    // Event listener untuk tombol simulasi
    document.getElementById('run-simulation').addEventListener('click', runSingleSimulation);
    document.getElementById('compare-scenarios').addEventListener('click', compareScenarios);
    document.getElementById('reset-comparison').addEventListener('click', resetComparison);
    
    // Event listener untuk modal
    document.getElementById('about-app').addEventListener('click', function(e) {
        e.preventDefault();
        document.getElementById('about-modal').classList.remove('hidden');
    });
    
    // Close button di dalam modal
    const closeModalButtons = document.querySelectorAll('.close-modal, .close-modal-btn');
    closeModalButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('about-modal').classList.add('hidden');
        });
    });
    
    // Close modal saat klik di luar konten
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('about-modal');
        if (event.target === modal) {
            modal.classList.add('hidden');
        }
    });
    
    // Close modal dengan tombol Escape
    window.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            document.getElementById('about-modal').classList.add('hidden');
        }
    });

});

// Mengatur event listeners untuk slider
function setupSliderListeners() {
    const sliders = [
        { id: 'num_docks', displayId: 'num_docks', suffix: '' },
        { id: 'num_workers', displayId: 'num_workers', suffix: '' },
        { id: 'num_forklifts', displayId: 'num_forklifts', suffix: '' },
        { id: 'sim_time', displayId: 'sim_time', suffix: ' menit' }
    ];
    
    sliders.forEach(slider => {
        const element = document.getElementById(slider.id);
        const display = element.parentElement.querySelector('.value-display');
        
        // Set nilai awal
        updateDisplay(element, display, slider.suffix);
        
        // Update saat slider berubah
        element.addEventListener('input', function() {
            updateDisplay(this, display, slider.suffix);
            
            // Jika ini slider waktu simulasi, update teks menjadi jam
            if (slider.id === 'sim_time') {
                const hours = Math.floor(this.value / 60);
                const minutes = this.value % 60;
                display.textContent = `${this.value} (${hours} jam ${minutes > 0 ? minutes + ' menit' : ''})`;
            }
        });
    });
}

// Fungsi untuk update display nilai slider
function updateDisplay(slider, displayElement, suffix = '') {
    displayElement.textContent = slider.value + suffix;
}

// Jalankan simulasi tunggal
async function runSingleSimulation() {
    showLoading(true);
    
    // Ambil parameter dari form
    const params = {
        num_docks: parseInt(document.getElementById('num_docks').value),
        num_workers: parseInt(document.getElementById('num_workers').value),
        num_forklifts: parseInt(document.getElementById('num_forklifts').value),
        sim_time: parseInt(document.getElementById('sim_time').value),
        seed: parseInt(document.getElementById('seed').value)
    };
    
    try {
        // Kirim request ke API
        const response = await fetch('/simulate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(params)
        });
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        // Simpan hasil
        simulationResults = result;
        
        // Tampilkan hasil
        displaySimulationResults(result);
        
        // Tampilkan insights
        generateInsights(result);
        
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Bandingkan dua skenario
async function compareScenarios() {
    showLoading(true);
    
    // Sembunyikan hasil simulasi tunggal
    document.querySelector('.simulation-results').style.display = 'none';
    
    // Tampilkan section perbandingan
    document.getElementById('scenario-comparison-section').classList.remove('hidden');
    
    // Update nilai di kartu perbandingan
    document.getElementById('scenario-a-docks').textContent = '2';
    document.getElementById('scenario-a-workers').textContent = '3';
    document.getElementById('scenario-a-forklifts').textContent = '2';
    
    document.getElementById('scenario-b-docks').textContent = '3';
    document.getElementById('scenario-b-workers').textContent = '5';
    document.getElementById('scenario-b-forklifts').textContent = '3';
    
    try {
        // Jalankan simulasi untuk kedua skenario
        const scenarioA = {
            num_docks: 2,
            num_workers: 3,
            num_forklifts: 2,
            sim_time: parseInt(document.getElementById('sim_time').value),
            seed: parseInt(document.getElementById('seed').value)
        };
        
        const scenarioB = {
            num_docks: 3,
            num_workers: 5,
            num_forklifts: 3,
            sim_time: parseInt(document.getElementById('sim_time').value),
            seed: parseInt(document.getElementById('seed').value)
        };
        
        // Jalankan simulasi secara paralel
        const [resultA, resultB] = await Promise.all([
            fetch('/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scenarioA)
            }).then(res => res.json()),
            
            fetch('/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(scenarioB)
            }).then(res => res.json())
        ]);
        
        if (resultA.error || resultB.error) {
            throw new Error(resultA.error || resultB.error);
        }
        
        // Simpan hasil perbandingan
        comparisonResults = { scenarioA: resultA, scenarioB: resultB };
        
        // Tampilkan hasil perbandingan
        displayComparisonResults(resultA, resultB);
        
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Reset perbandingan dan kembali ke tampilan normal
function resetComparison() {
    document.getElementById('scenario-comparison-section').classList.add('hidden');
    document.querySelector('.simulation-results').style.display = 'block';
    document.getElementById('results-container').innerHTML = `
        <div class="placeholder">
            <p><i class="fas fa-info-circle"></i> Atur parameter di sebelah kiri dan klik "Jalankan Simulasi" untuk melihat hasil</p>
        </div>
    `;
}

// Tampilkan hasil simulasi tunggal
function displaySimulationResults(result) {
    const container = document.getElementById('results-container');
    
    // Hitung waktu tunggu rata-rata yang diestimasi (untuk demo, karena API mungkin tidak mengembalikan ini secara langsung)
    const estimatedWaitTime = result.output.average_time_in_system * 0.4;
    const throughputPerHour = (result.output.total_trucks_processed / (result.input.sim_time_minutes / 60)).toFixed(1);
    
    container.innerHTML = `
        <div class="result-summary">
            <div class="result-metric">
                <h4>Total Truk Diproses</h4>
                <div class="metric-value">${result.output.total_trucks_processed}</div>
                <p>dalam ${result.input.sim_time_minutes} menit simulasi</p>
            </div>
            <div class="result-metric">
                <h4>Rata-rata Waktu di Sistem</h4>
                <div class="metric-value">${result.output.average_time_in_system.toFixed(1)} menit</div>
                <p>waktu dari kedatangan hingga selesai</p>
            </div>
            <div class="result-metric">
                <h4>Estimasi Waktu Tunggu</h4>
                <div class="metric-value">${estimatedWaitTime.toFixed(1)} menit</div>
                <p>rata-rata waktu antrean</p>
            </div>
            <div class="result-metric">
                <h4>Throughput</h4>
                <div class="metric-value">${throughputPerHour} truk/jam</div>
                <p>kapasitas pemrosesan sistem</p>
            </div>
        </div>
        <div class="chart-container">
            <canvas id="simulation-chart"></canvas>
        </div>
        <div class="simulation-details">
            <h3><i class="fas fa-cogs"></i> Parameter Simulasi</h3>
            <p><strong>Jumlah Dock Loading:</strong> ${result.input.num_docks}</p>
            <p><strong>Jumlah Pekerja:</strong> ${result.input.num_workers}</p>
            <p><strong>Jumlah Forklift:</strong> ${result.input.num_forklifts}</p>
            <p><strong>Durasi Simulasi:</strong> ${result.input.sim_time_minutes} menit (${Math.floor(result.input.sim_time_minutes/60)} jam)</p>
            <p><strong>Random Seed:</strong> ${result.input.seed}</p>
        </div>
    `;
    
    // Coba tampilkan chart jika library chart.js tersedia
    renderSimulationChart(result);
}

// Tampilkan hasil perbandingan skenario
function displayComparisonResults(resultA, resultB) {
    const container = document.getElementById('comparison-results');
    
    // Hitung perbaikan
    const trucksImprovement = ((resultB.output.total_trucks_processed - resultA.output.total_trucks_processed) / resultA.output.total_trucks_processed * 100).toFixed(1);
    const timeImprovement = ((resultA.output.average_time_in_system - resultB.output.average_time_in_system) / resultA.output.average_time_in_system * 100).toFixed(1);
    const throughputA = (resultA.output.total_trucks_processed / (resultA.input.sim_time_minutes / 60)).toFixed(1);
    const throughputB = (resultB.output.total_trucks_processed / (resultB.input.sim_time_minutes / 60)).toFixed(1);
    const throughputImprovement = ((throughputB - throughputA) / throughputA * 100).toFixed(1);
    
    container.innerHTML = `
        <div class="comparison-metrics">
            <div class="metric-card">
                <h4>Total Truk Diproses</h4>
                <div class="metric-comparison">
                    <span class="scenario-a">${resultA.output.total_trucks_processed}</span> → 
                    <span class="scenario-b">${resultB.output.total_trucks_processed}</span>
                </div>
                <div class="${parseFloat(trucksImprovement) > 0 ? 'improvement' : 'degradation'}">
                    ${parseFloat(trucksImprovement) > 0 ? '↑' : '↓'} ${Math.abs(trucksImprovement)}% peningkatan
                </div>
            </div>
            <div class="metric-card">
                <h4>Rata-rata Waktu di Sistem</h4>
                <div class="metric-comparison">
                    <span class="scenario-a">${resultA.output.average_time_in_system.toFixed(1)}m</span> → 
                    <span class="scenario-b">${resultB.output.average_time_in_system.toFixed(1)}m</span>
                </div>
                <div class="${parseFloat(timeImprovement) > 0 ? 'improvement' : 'degradation'}">
                    ${parseFloat(timeImprovement) > 0 ? '↓' : '↑'} ${Math.abs(timeImprovement)}% ${parseFloat(timeImprovement) > 0 ? 'pengurangan' : 'peningkatan'}
                </div>
                <p class="metric-note">Lebih rendah lebih baik</p>
            </div>
            <div class="metric-card">
                <h4>Throughput (Truk/Jam)</h4>
                <div class="metric-comparison">
                    <span class="scenario-a">${throughputA}</span> → 
                    <span class="scenario-b">${throughputB}</span>
                </div>
                <div class="${parseFloat(throughputImprovement) > 0 ? 'improvement' : 'degradation'}">
                    ${parseFloat(throughputImprovement) > 0 ? '↑' : '↓'} ${Math.abs(throughputImprovement)}% peningkatan
                </div>
            </div>
        </div>
        <div class="chart-container">
            <canvas id="comparison-chart"></canvas>
        </div>
        <div class="recommendation">
            <h3><i class="fas fa-lightbulb"></i> Rekomendasi</h3>
            ${parseFloat(trucksImprovement) > 15 ? 
                `<p class="recommendation-text"><strong>Berdasarkan simulasi, direkomendasikan untuk meningkatkan kapasitas menjadi konfigurasi Skenario B.</strong></p>
                <p class="recommendation-reason">Penambahan 1 dock loading, 2 pekerja, dan 1 forklift menghasilkan peningkatan throughput sebesar ${throughputImprovement}% dan pengurangan waktu tunggu sebesar ${timeImprovement}%. Investasi ini akan memberikan ROI positif dalam jangka menengah melalui peningkatan kapasitas pemrosesan dan kepuasan mitra supplier.</p>` :
                `<p class="recommendation-text"><strong>Penambahan kapasitas pada Skenario B memberikan peningkatan marginal.</strong></p>
                <p class="recommendation-reason">Pertimbangkan solusi alternatif seperti optimasi jadwal kedatangan truk atau penambahan shift kerja sebelum melakukan investasi infrastruktur yang signifikan.</p>`}
        </div>
    `;
    
    // Render comparison chart
    renderComparisonChart(resultA, resultB);
}

// Generate insights berdasarkan hasil simulasi
function generateInsights(result) {
    const container = document.getElementById('insights-container');
    
    // Hitung metrik untuk analisis
    const avgTime = result.output.average_time_in_system;
    const trucksProcessed = result.output.total_trucks_processed;
    const simTime = result.input.sim_time_minutes;
    const throughput = (trucksProcessed / (simTime / 60)).toFixed(1);
    const capacityUtilization = (trucksProcessed / (simTime / 15)).toFixed(2) * 100; // Asumsi truk datang setiap 15 menit
    
    let insights = '';
    
    if (avgTime > 60) {
        insights += `
        <div class="insight-card">
            <h3><i class="fas fa-exclamation-triangle"></i> Peringatan: Waktu Pemrosesan Tinggi</h3>
            <p>Rata-rata waktu truk dalam sistem adalah ${avgTime.toFixed(1)} menit, melebihi batas optimal 60 menit.</p>
            <ul>
                <li>⏰ Truk menghabiskan terlalu banyak waktu mengantre</li>
                <li>⚠️ Potensi ketidakpuasan mitra supplier</li>
                <li>💡 Rekomendasi: Pertimbangkan penambahan dock loading</li>
            </ul>
        </div>
        `;
    } else if (avgTime > 40) {
        insights += `
        <div class="insight-card">
            <h3><i class="fas fa-info-circle"></i> Perhatian: Waktu Pemrosesan Sedang</h3>
            <p>Rata-rata waktu truk dalam sistem adalah ${avgTime.toFixed(1)} menit, mendekati batas optimal.</p>
            <ul>
                <li>📊 Sistem beroperasi pada kapasitas 80-90%</li>
                <li>🔍 Pantau terus selama jam sibuk</li>
                <li>💡 Rekomendasi: Optimalkan jadwal kedatangan</li>
            </ul>
        </div>
        `;
    } else {
        insights += `
        <div class="insight-card">
            <h3><i class="fas fa-check-circle"></i> Sistem Beroperasi Optimal</h3>
            <p>Rata-rata waktu truk dalam sistem adalah ${avgTime.toFixed(1)} menit, di bawah batas optimal 40 menit.</p>
            <ul>
                <li>✅ Utilisasi sumber daya seimbang</li>
                <li>📈 Kapasitas cadangan untuk pertumbuhan</li>
                <li>💡 Rekomendasi: Pertahankan konfigurasi saat ini</li>
            </ul>
        </div>
        `;
    }
    
    if (throughput < 4) {
        insights += `
        <div class="insight-card">
            <h3><i class="fas fa-tachometer-alt"></i> Kapasitas Pemrosesan Rendah</h3>
            <p>Throughput sistem hanya ${throughput} truk per jam.</p>
            <ul>
                <li>📉 Kapasitas di bawah rata-rata industri (6-8 truk/jam)</li>
                <li>⚠️ Potensi bottleneck di stasiun loading</li>
                <li>💡 Rekomendasi: Evaluasi penambahan forklift dan operator</li>
            </ul>
        </div>
        `;
    }
    
    // Jika tidak ada insight yang dihasilkan (seharusnya tidak terjadi), tampilkan default
    if (!insights) {
        insights = `
        <div class="insight-card">
            <p><i class="fas fa-lightbulb"></i> Sesuaikan parameter simulasi untuk mendapatkan insight khusus untuk operasional gudang Anda. Analisis "What-If" akan membantu Anda membuat keputusan berbasis data tentang alokasi sumber daya.</p>
        </div>
        `;
    }
    
    container.innerHTML = insights;
}

// Tampilkan loading spinner
function showLoading(show) {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.innerHTML = `
        <div class="loading-spinner"></div>
        <div class="loading-text">Menjalankan simulasi...</div>
    `;
    
    if (show) {
        document.body.appendChild(overlay);
    } else {
        const existingOverlay = document.querySelector('.loading-overlay');
        if (existingOverlay) {
            document.body.removeChild(existingOverlay);
        }
    }
}

// Tampilkan error
function showError(message) {
    const container = document.getElementById('results-container');
    container.innerHTML = `
        <div class="result-metric" style="border-left-color: var(--accent-color);">
            <h4><i class="fas fa-exclamation-triangle"></i> Error</h4>
            <p style="color: var(--accent-color);">${message}</p>
            <p>Silakan periksa parameter simulasi dan coba lagi.</p>
        </div>
    `;
    
    // Juga tampilkan di console untuk debugging
    console.error('Simulation Error:', message);
}

// Render chart untuk simulasi tunggal (placeholder jika Chart.js tidak tersedia)
function renderSimulationChart(result) {
    // Di implementasi nyata, integrasikan dengan Chart.js
    // Untuk demo, tampilkan placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'chart-placeholder';
    placeholder.innerHTML = `
        <p style="text-align: center; padding: 20px; color: #7f8c8d;">
            <i class="fas fa-chart-bar fa-3x"></i><br>
            Visualisasi Grafik Akan Ditampilkan di Sini<br>
            (Integrasi dengan Chart.js)
        </p>
    `;
    document.getElementById('simulation-chart').parentNode.replaceChild(placeholder, document.getElementById('simulation-chart'));
}

// Render chart untuk perbandingan skenario (placeholder)
function renderComparisonChart(resultA, resultB) {
    // Di implementasi nyata, integrasikan dengan Chart.js
    // Untuk demo, tampilkan placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'chart-placeholder';
    placeholder.innerHTML = `
        <p style="text-align: center; padding: 20px; color: #7f8c8d;">
            <i class="fas fa-chart-line fa-3x"></i><br>
            Grafik Perbandingan Skenario<br>
            (Integrasi dengan Chart.js)
        </p>
    `;
    document.getElementById('comparison-chart').parentNode.replaceChild(placeholder, document.getElementById('comparison-chart'));
}

// Fungsi untuk ekspor data (placeholder)
function exportSimulationData() {
    if (Object.keys(simulationResults).length === 0) {
        alert('Tidak ada data simulasi untuk diekspor. Silakan jalankan simulasi terlebih dahulu.');
        return;
    }
    
    // Di implementasi nyata, ekspor data ke CSV atau JSON
    alert('Fitur ekspor data akan diimplementasikan di versi berikutnya.');
}