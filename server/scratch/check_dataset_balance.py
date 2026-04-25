import os

def check_balance(base_dir):
    print(f"Checking dataset balance in: {base_dir}")
    if not os.path.exists(base_dir):
        print("Directory not found!")
        return

    for phase in ["train", "val"]:
        phase_dir = os.path.join(base_dir, phase)
        if not os.path.exists(phase_dir):
            continue
            
        print(f"\nPhase: {phase}")
        total = 0
        counts = {}
        for class_name in os.listdir(phase_dir):
            class_path = os.path.join(phase_dir, class_name)
            if os.path.isdir(class_path):
                num_files = len([f for f in os.listdir(class_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))])
                counts[class_name] = num_files
                total += num_files
                
        for class_name, count in counts.items():
            print(f"  {class_name}: {count} images")
        print(f"  Total: {total} images")

if __name__ == "__main__":
    check_balance(r"c:\Users\DELL\Documents\freshway\server\data")
