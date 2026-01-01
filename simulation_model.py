
import simpy
import random
import numpy as np

# --- Parameter default (bisa di-override) ---
MIN_INTERARRIVAL = 15
MAX_INTERARRIVAL = 45
MIN_UNLOADING = 20
MAX_UNLOADING = 40
MIN_SORTING = 15
MAX_SORTING = 30

def run_ecommerce_warehouse_simulation(num_docks=2, num_workers=3, num_forklifts=2, sim_time=480, seed=42):
    random.seed(seed)
    env = simpy.Environment()
    
    dock = simpy.Resource(env, capacity=num_docks)
    worker = simpy.Resource(env, capacity=num_workers)
    forklift = simpy.Resource(env, capacity=num_forklifts)
    
    stats = {
        'truck_records': [],
        'total_trucks': 0
    }

    def truck_process(env, truck_id, dock, worker, forklift, stats):
        arrival = env.now
        with dock.request() as req_dock:
            yield req_dock
            start_unload = env.now
            with forklift.request() as req_forklift:
                yield req_forklift
                yield env.timeout(random.uniform(MIN_UNLOADING, MAX_UNLOADING))
            finish_unload = env.now
        with worker.request() as req_worker:
            yield req_worker
            yield env.timeout(random.uniform(MIN_SORTING, MAX_SORTING))
            finish_sort = env.now
        
        total_time = finish_sort - arrival
        stats['truck_records'].append({
            'truck_id': truck_id,
            'total_time_in_system': total_time,
            'finish_time': finish_sort
        })

    def truck_generator(env, dock, worker, forklift, stats):
        truck_id = 1
        while env.now < sim_time:
            env.process(truck_process(env, truck_id, dock, worker, forklift, stats))
            yield env.timeout(random.uniform(MIN_INTERARRIVAL, MAX_INTERARRIVAL))
            truck_id += 1
        stats['total_trucks'] = truck_id - 1

    env.process(truck_generator(env, dock, worker, forklift, stats))
    env.run(until=sim_time)
    
    # Hitung metrik ringkasan
    total_trucks = stats['total_trucks']
    avg_time = np.mean([r['total_time_in_system'] for r in stats['truck_records']]) if stats['truck_records'] else 0
    
    return {
        'total_trucks_processed': total_trucks,
        'average_time_in_system': float(avg_time),
        'simulation_duration_minutes': sim_time
    }
