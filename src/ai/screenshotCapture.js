async captureScreenshot(figmaData, viewport, conditions, outputPath) {
  try {
    console.log(`\nCapturing ${viewport} screenshot with conditions:`, conditions);
    
    // Get export settings
    const settings = this.viewports[viewport];
    
    // Get the image data
    const imageData = await this.figma.exportImage(
      figmaData.id,
      {
        format: 'PNG',
        scale: 2,
        ...settings
      }
    );

    // Save the image
    await fs.writeFile(outputPath, imageData);
    console.log(`Saved screenshot to: ${outputPath}`);

    return true;
  } catch (error) {
    console.error(`Failed to capture ${viewport} screenshot:`, error);
    return false;
  }
} 