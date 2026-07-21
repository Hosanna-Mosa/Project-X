from PIL import Image

def remove_white_bg(input_path, output_path, tolerance=240):
    img = Image.open(input_path).convert("RGBA")
    data = img.getdata()
    new_data = []
    
    for item in data:
        # Check if the pixel is near white
        if item[0] > tolerance and item[1] > tolerance and item[2] > tolerance:
            new_data.append((255, 255, 255, 0)) # transparent
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")
    print("Saved transparent image to", output_path)

input_file = "e:/X/x25/Project-X/driver/assets/images/generated_blue_scooter.png"
remove_white_bg(input_file, input_file)
