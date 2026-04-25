import os
import shutil
import random

def prepare_dataset(source_dir, target_dir):
    print(f"Scanning source directory: {source_dir}")
    
    # Define classes and mapping
    classes = {"highly_fresh": [], "fresh": [], "not_fresh": []}
    
    # Collect all image paths
    for folder_name in os.listdir(source_dir):
        folder_path = os.path.join(source_dir, folder_name)
        if not os.path.isdir(folder_path):
            continue
            
        lower_name = folder_name.lower()
        target_class = None
        
        # Careful with matching "highly fresh" vs "fresh"
        if "highly fresh" in lower_name:
            target_class = "highly_fresh"
        elif "not fresh" in lower_name:
            target_class = "not_fresh"
        elif "fresh" in lower_name:
            target_class = "fresh"
            
        if target_class:
            images = [os.path.join(folder_path, f) for f in os.listdir(folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]
            classes[target_class].extend(images)
            
    # Print initial counts
    print("\nInitial Image Counts:")
    for c, imgs in classes.items():
        print(f"  {c}: {len(imgs)}")
        
    # Find minimum count to balance
    min_count = min(len(imgs) for imgs in classes.values())
    if min_count == 0:
        print("Error: One or more classes have 0 images!")
        return
        
    print(f"\nBalancing dataset to {min_count} images per class...")
    
    # Create clean target directories
    for phase in ["train", "val"]:
        phase_dir = os.path.join(target_dir, phase)
        if os.path.exists(phase_dir):
            shutil.rmtree(phase_dir)
        os.makedirs(phase_dir)
        for c in classes.keys():
            os.makedirs(os.path.join(phase_dir, c))
            
    # Sample and copy images
    split_ratio = 0.8
    train_count = int(min_count * split_ratio)
    val_count = min_count - train_count
    
    print(f"Splitting: {train_count} for train, {val_count} for val")
    
    for c, imgs in classes.items():
        # Shuffle randomly
        random.shuffle(imgs)
        
        # Take min_count
        selected_imgs = imgs[:min_count]
        
        # Split into train and val
        train_imgs = selected_imgs[:train_count]
        val_imgs = selected_imgs[train_count:]
        
        # Copy to train
        for i, src in enumerate(train_imgs):
            ext = os.path.splitext(src)[1]
            dest = os.path.join(target_dir, "train", c, f"{c}_{i:04d}{ext}")
            shutil.copy2(src, dest)
            
        # Copy to val
        for i, src in enumerate(val_imgs):
            ext = os.path.splitext(src)[1]
            dest = os.path.join(target_dir, "val", c, f"{c}_{i:04d}{ext}")
            shutil.copy2(src, dest)
            
    print("\nDataset preparation complete!")
    print(f"Images are ready in {target_dir}")

if __name__ == "__main__":
    src = r"C:\Users\DELL\Desktop\freshness"
    dest = r"c:\Users\DELL\Documents\freshway\server\data"
    prepare_dataset(src, dest)
