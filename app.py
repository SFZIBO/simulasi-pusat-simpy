# app.py
from flask import Flask, request, jsonify, render_template
import json
import sys
import os

# Tambahkan direktori saat ini ke path agar bisa import simulation_model
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from simulation_model import run_ecommerce_warehouse_simulation
except ImportError:
    # Jika gagal, kembalikan error saat endpoint dipanggil
    run_ecommerce_warehouse_simulation = None

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html') if os.path.exists('templates/index.html') else jsonify({"message": "Silakan kirim POST ke /simulate"})

@app.route('/simulate', methods=['POST'])
def simulate():
    if run_ecommerce_warehouse_simulation is None:
        return jsonify({"error": "Model simulasi tidak ditemukan. Pastikan simulation_model.py ada di folder yang sama."}), 500

    try:
        data = request.get_json() or {}

        # Ambil parameter dari request, gunakan default jika tidak diberikan
        num_docks = int(data.get('num_docks', 2))
        num_workers = int(data.get('num_workers', 3))
        num_forklifts = int(data.get('num_forklifts', 2))
        sim_time = int(data.get('sim_time', 480))
        seed = int(data.get('seed', 42))

        # Validasi input
        if not (1 <= num_docks <= 10):
            return jsonify({"error": "num_docks harus antara 1 dan 10"}), 400
        if not (1 <= num_workers <= 20):
            return jsonify({"error": "num_workers harus antara 1 dan 20"}), 400
        if not (1 <= num_forklifts <= 10):
            return jsonify({"error": "num_forklifts harus antara 1 dan 10"}), 400
        if not (60 <= sim_time <= 1440):
            return jsonify({"error": "sim_time harus antara 60 dan 1440 menit (1-24 jam)"}), 400

        # Jalankan simulasi
        result = run_ecommerce_warehouse_simulation(
            num_docks=num_docks,
            num_workers=num_workers,
            num_forklifts=num_forklifts,
            sim_time=sim_time,
            seed=seed
        )

        return jsonify({
            "status": "success",
            "input": {
                "num_docks": num_docks,
                "num_workers": num_workers,
                "num_forklifts": num_forklifts,
                "sim_time_minutes": sim_time,
                "seed": seed
            },
            "output": result
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))