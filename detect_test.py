''' 
Making a dectection test to comparation between a picture taken and all the printable april tags 
'''
"""
Efficient April Tag Detection and Matching
Takes an image and detects which player's April Tag is present
"""

import cv2
import numpy as np
import sys
import os
from tkinter import Tk, filedialog

# Initialize April Tag detector (do this once, not per function call)
ARUCO_DICT = cv2.aruco.getPredefinedDictionary(cv2.aruco.DICT_APRILTAG_36h11)
ARUCO_PARAMS = cv2.aruco.DetectorParameters()
DETECTOR = cv2.aruco.ArucoDetector(ARUCO_DICT, ARUCO_PARAMS)

def select_image_file():
    """
    Open file dialog to select an image file
    
    Returns:
        str or None: Selected file path or None if cancelled
    """
    # Hide the root Tkinter window
    root = Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    
    print("📂 Opening file dialog...")
    print("   Please select an image file...")
    
    # Open file dialog
    file_path = filedialog.askopenfilename(
        title="Select April Tag Image",
        filetypes=[
            ("Image files", "*.jpg *.jpeg *.png *.bmp *.gif"),
            ("JPEG files", "*.jpg *.jpeg"),
            ("PNG files", "*.png"),
            ("All files", "*.*")
        ]
    )
    
    root.destroy()
    
    if not file_path:
        print("❌ No file selected")
        return None
    
    print(f"✅ Selected: {os.path.basename(file_path)}")
    return file_path


def detect_player_tag(image_path):
    """
    Detect April Tag in image and return player tag ID
    
    Args:
        image_path (str): Path to image file
        
    Returns:
        int or None: Player tag ID if detected, None if no tag found
    """
    # Read image
    img = cv2.imread(image_path)
    
    if img is None:
        print(f"❌ Error: Could not read image '{image_path}'")
        return None
    
    # Convert to grayscale for better detection
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Detect April Tags
    corners, ids, rejected = DETECTOR.detectMarkers(gray)
    
    # Check if any tags detected
    if ids is None or len(ids) == 0:
        print("❌ No April Tag detected in image")
        print("   Make sure:")
        print("   • Tag is clearly visible")
        print("   • Tag is not blurry")
        print("   • Lighting is adequate")
        print("   • Tag is facing camera")
        return None
    
    # Return first detected tag ID (assuming one tag per image)
    tag_id = int(ids[0][0])
    
    # Print result
    print()
    print("=" * 50)
    print("✅ APRIL TAG DETECTED!")
    print("=" * 50)
    print(f"🏷️  Tag ID: {tag_id}")
    print(f"🎮 Player Tag ID: {tag_id}")
    print(f"👤 Player Number: {tag_id + 1}")
    print("=" * 50)
    
    return tag_id


def detect_all_tags(image_path, verbose=True):
    """
    Detect ALL April Tags in image and return list of tag IDs
    Useful if multiple tags are in frame
    
    Args:
        image_path (str): Path to image file
        verbose (bool): Print detailed info
        
    Returns:
        list: List of detected tag IDs, empty list if none found
    """
    img = cv2.imread(image_path)
    
    if img is None:
        if verbose:
            print(f"❌ Error: Could not read image '{image_path}'")
        return []
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    corners, ids, rejected = DETECTOR.detectMarkers(gray)
    
    if ids is None or len(ids) == 0:
        if verbose:
            print("❌ No April Tags detected in image")
        return []
    
    # Convert to list of integers
    tag_ids = [int(tag_id[0]) for tag_id in ids]
    
    if verbose:
        print(f"✅ Detected {len(tag_ids)} April Tag(s):")
        for i, tag_id in enumerate(tag_ids, 1):
            print(f"   {i}. Player Tag ID: {tag_id} (Player {tag_id + 1})")
    
    return tag_ids


def detect_tag_from_camera(camera_index=0, wait_time=3):
    """
    Capture image from camera and detect April Tag
    Useful for live testing
    
    Args:
        camera_index (int): Camera device index (0 for default)
        wait_time (int): Seconds to wait before capturing
        
    Returns:
        int or None: Detected tag ID or None
    """
    print(f"📷 Opening camera {camera_index}...")
    cap = cv2.VideoCapture(camera_index)
    
    if not cap.isOpened():
        print("❌ Error: Could not open camera")
        return None
    
    print(f"⏳ Get ready! Capturing in {wait_time} seconds...")
    print("   Position your April Tag in front of camera...")
    
    # Warm up camera and wait
    import time
    for i in range(wait_time, 0, -1):
        ret, frame = cap.read()
        print(f"   {i}...")
        time.sleep(1)
    
    # Capture frame
    ret, frame = cap.read()
    cap.release()
    
    if not ret:
        print("❌ Error: Failed to capture image")
        return None
    
    print("📸 Image captured!")
    
    # Detect tag
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    corners, ids, rejected = DETECTOR.detectMarkers(gray)
    
    if ids is None or len(ids) == 0:
        print("❌ No April Tag detected")
        return None
    
    tag_id = int(ids[0][0])
    print()
    print("=" * 50)
    print("✅ APRIL TAG DETECTED!")
    print("=" * 50)
    print(f"🏷️  Tag ID: {tag_id}")
    print(f"🎮 Player Tag ID: {tag_id}")
    print(f"👤 Player Number: {tag_id + 1}")
    print("=" * 50)
    
    return tag_id


def batch_detect_tags(image_folder):
    """
    Detect tags in all images in a folder
    Useful for testing multiple images at once
    
    Args:
        image_folder (str): Path to folder containing images
        
    Returns:
        dict: Dictionary mapping filename to detected tag IDs
    """
    results = {}
    
    if not os.path.exists(image_folder):
        print(f"❌ Error: Folder '{image_folder}' does not exist")
        return results
    
    # Get all image files
    image_extensions = ('.jpg', '.jpeg', '.png', '.bmp')
    image_files = [f for f in os.listdir(image_folder) 
                   if f.lower().endswith(image_extensions)]
    
    if not image_files:
        print(f"❌ No image files found in '{image_folder}'")
        return results
    
    print(f"🔍 Processing {len(image_files)} images...\n")
    
    for filename in image_files:
        filepath = os.path.join(image_folder, filename)
        print(f"📄 {filename}:")
        
        tag_ids = detect_all_tags(filepath, verbose=False)
        results[filename] = tag_ids
        
        if tag_ids:
            print(f"   ✅ Detected: {tag_ids}")
        else:
            print(f"   ❌ No tags detected")
        print()
    
    # Summary
    print("=" * 50)
    print("SUMMARY:")
    total_detected = sum(1 for tags in results.values() if tags)
    print(f"✅ Successfully detected tags in {total_detected}/{len(image_files)} images")
    
    return results


# Command-line interface
if __name__ == '__main__':
    print("=" * 60)
    print("🏷️  April Tag Player Detection")
    print("=" * 60)
    print()
    
    # Check if file path provided as argument
    if len(sys.argv) >= 2:
        command = sys.argv[1].lower()
        
        if command == 'camera':
            # Detect from camera
            detect_tag_from_camera()
        
        elif command == 'folder':
            # Batch process folder
            if len(sys.argv) < 3:
                print("❌ Error: Please specify folder path")
                print("Usage: python match_tag.py folder <folder_path>")
                sys.exit(1)
            
            folder_path = sys.argv[2]
            batch_detect_tags(folder_path)
        
        else:
            # Detect from image file provided as argument
            image_path = sys.argv[1]
            
            if not os.path.exists(image_path):
                print(f"❌ Error: File '{image_path}' not found")
                sys.exit(1)
            
            detect_player_tag(image_path)
    
    else:
        # No arguments - open file dialog
        print("Mode: Interactive File Selection")
        print()
        
        image_path = select_image_file()
        
        if image_path:
            print()
            print("🔍 Detecting April Tag...")
            print()
            detect_player_tag(image_path)
        else:
            print()
            print("⚠️  No file selected. Exiting.")
    
    print()
    print("=" * 60)