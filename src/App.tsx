import React, { useState, useEffect } from 'react';
import './App.css';
import JSZip from 'jszip';

// Fallback component for when the image can't be loaded
const FallbackImage: React.FC<{ rows: number; columns: number }> = ({ rows, columns }) => {
  return (
    <div className="fallback-image">
      <div className="fallback-grid" style={{ 
        display: 'grid',
        gridTemplateColumns: `repeat(${columns || 4}, 1fr)`,
        gridTemplateRows: `repeat(${rows || 4}, 1fr)`,
        width: '100%',
        height: '100%'
      }}>
        {Array.from({ length: (rows || 4) * (columns || 4) }).map((_, index) => (
          <div 
            key={index} 
            className="fallback-cell"
            style={{
              border: '1px solid #666',
              backgroundColor: index % 2 === 0 ? '#444' : '#555'
            }}
          />
        ))}
      </div>
      <div className="fallback-text">Lame Unicorn Sprite Slicer</div>
    </div>
  );
};

// Types
interface GridCell {
  row: number;
  col: number;
  order: number;
}

function App() {
  // State
  const [imagePath, setImagePath] = useState<string>('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [columns, setColumns] = useState<number>(0);
  const [rows, setRows] = useState<number>(0);
  const [selectedCells, setSelectedCells] = useState<GridCell[]>([]);
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [imageError, setImageError] = useState<boolean>(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  const [sceneName, setSceneName] = useState<string>('scene');
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  
  // References
  const imageRef = React.useRef<HTMLImageElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const imageContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Handle image error
  const handleImageError = () => {
    console.error("Error loading image from:", imagePath);
    setImageError(true);
    // We'll render the FallbackImage component instead
  };

  // Handle grid cell click
  const handleCellClick = (row: number, col: number) => {
    // Check if cell is already selected
    const cellIndex = selectedCells.findIndex(cell => cell.row === row && cell.col === col);
    
    if (cellIndex !== -1) {
      // If already selected, remove it and all cells after it
      setSelectedCells(prev => prev.slice(0, cellIndex));
    } else {
      // Add new cell with next order number
      const newCell: GridCell = {
        row,
        col,
        order: selectedCells.length + 1
      };
      setSelectedCells(prev => [...prev, newCell]);
    }
  };

  // Clear all selections
  const clearSelections = () => {
    setSelectedCells([]);
  };

  // Remove last selection
  const removeLastSelection = () => {
    setSelectedCells(prev => prev.slice(0, -1));
  };

  // Reset selections when grid dimensions change
  useEffect(() => {
    clearSelections();
  }, [rows, columns]);

  // Reset zoom and pan when new image is loaded
  useEffect(() => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  }, [uploadedImage, imagePath]);

  // Cleanup object URL when component unmounts or when a new image is uploaded
  useEffect(() => {
    return () => {
      if (uploadedImage) {
        URL.revokeObjectURL(uploadedImage);
      }
    };
  }, [uploadedImage]);
  
  // Update image dimensions when window is resized
  useEffect(() => {
    const updateImageDimensions = () => {
      if (imageRef.current) {
        setImageDimensions({
          width: imageRef.current.clientWidth,
          height: imageRef.current.clientHeight
        });
      }
    };
    
    // Add event listener for window resize
    window.addEventListener('resize', updateImageDimensions);
    
    // Initial update
    if (imageLoaded) {
      updateImageDimensions();
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updateImageDimensions);
    };
  }, [imageLoaded]);

  // Handle grid dimensions change
  const handleColumnsChange = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setColumns(isNaN(value) ? 0 : value);
  };

  const handleRowsChange = (e: React.FocusEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setRows(isNaN(value) ? 0 : value);
  };

  // Handle image load
  const handleImageLoad = () => {
    setImageLoaded(true);
    
    // Get the actual dimensions of the loaded image
    if (imageRef.current) {
      const { width, height, naturalWidth, naturalHeight } = imageRef.current;
      setImageDimensions({
        width: width,
        height: height
      });
      console.log('Image dimensions:', { width, height, naturalWidth, naturalHeight });
    }
  };

  // Handle scene name change
  const handleSceneNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSceneName(e.target.value);
  };

  // Zoom functions
  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev * 1.2, 5)); // Max zoom 5x
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev / 1.2, 0.1)); // Min zoom 0.1x
  };

  const handleZoomReset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 0.1), 5));
  };

  // Pan functions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && dragStart && zoom > 1) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragStart(null);
  };

  // Handle image upload button click
  const handleUploadButtonClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      
      // Check if the file is an image
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Reset state
      setImageLoaded(false);
      setImageError(false);
      clearSelections();
      setZoom(1);
      setPanX(0);
      setPanY(0);
      
      // Create a URL for the uploaded image
      const imageUrl = URL.createObjectURL(file);
      setUploadedImage(imageUrl);
      
      // Reset the file input so the same file can be selected again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle download button click
  const handleDownload = async () => {
    if (!imageRef.current || selectedCells.length === 0 || !imageLoaded) {
      console.error('Cannot download: Image not loaded or no cells selected');
      return;
    }

    try {
      // Create a canvas to draw the image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        console.error('Could not get canvas context');
        return;
      }

      // Get the original image dimensions
      const { naturalWidth, naturalHeight } = imageRef.current;
      
      // Calculate cell dimensions
      const cellWidth = naturalWidth / columns;
      const cellHeight = naturalHeight / rows;

      // Create a zip file
      const zip = new JSZip();
      
      // Process each selected cell
      for (const cell of selectedCells) {
        // Set canvas size to the cell size
        canvas.width = cellWidth;
        canvas.height = cellHeight;
        
        // Calculate the source coordinates in the original image
        const sourceX = cell.col * cellWidth;
        const sourceY = cell.row * cellHeight;
        
        // Draw the cell portion to the canvas
        ctx.drawImage(
          imageRef.current,
          sourceX, sourceY, cellWidth, cellHeight,  // Source coordinates and dimensions
          0, 0, cellWidth, cellHeight               // Destination coordinates and dimensions
        );
        
        // Convert canvas to blob
        const blob = await new Promise<Blob | null>(resolve => {
          canvas.toBlob(resolve, 'image/png');
        });
        
        if (!blob) {
          console.error('Failed to create image blob');
          continue;
        }
        
        // Add the image to the zip file
        const fileName = `${sceneName}_${cell.order}.png`;
        zip.file(fileName, blob);
      }
      
      // Generate the zip file
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      
      // Create a download link
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(zipBlob);
      downloadLink.download = `${sceneName}_sprites.zip`;
      
      // Trigger the download
      document.body.appendChild(downloadLink);
      downloadLink.click();
      
      // Clean up
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadLink.href);
      
    } catch (error) {
      console.error('Error creating zip file:', error);
    }
  };

  return (
    <div className="App">
      <div className="sprite-slicer">
        <div className="grid-tools">
          <h1>Lame Unicorn Games</h1>
          <h1>Sprite Slicer</h1>
          <div style={{ marginTop: '60px' }}></div>
          <div className="tool-item">
            <label htmlFor="columns">Columns:</label>
            <input 
              type="number" 
              id="columns" 
              value={columns || ''} 
              onChange={(e) => setColumns(parseInt(e.target.value) || 0)}
              onBlur={handleColumnsChange}
              min="0"
            />
          </div>
          <div className="tool-item">
            <label htmlFor="rows">Rows:</label>
            <input 
              type="number" 
              id="rows" 
              value={rows || ''} 
              onChange={(e) => setRows(parseInt(e.target.value) || 0)}
              onBlur={handleRowsChange}
              min="0"
            />
          </div>
          <div className="tool-item">
            <button 
              onClick={handleUploadButtonClick}
              style={{ backgroundColor: '#007bff', color: 'white' }}
            >
              Open Image
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>
          {/* Only show Clear Selections and Remove Last buttons when grid is active */}
          {rows > 0 && columns > 0 && (
            <>
              <div className="tool-item">
                <button onClick={clearSelections}>Clear Selections</button>
              </div>
              <div className="tool-item">
                <button onClick={removeLastSelection}>Remove Last</button>
              </div>
            </>
          )}
          
          {/* Zoom controls */}
          {(imageLoaded || imageError) && (
            <>
              <div className="tool-item">
                <button onClick={handleZoomIn}>Zoom In</button>
              </div>
              <div className="tool-item">
                <button onClick={handleZoomOut}>Zoom Out</button>
              </div>
              <div className="tool-item">
                <button onClick={handleZoomReset}>Reset Zoom</button>
              </div>
              <div className="tool-item zoom-display">
                <span>Zoom: {Math.round(zoom * 100)}%</span>
              </div>
            </>
          )}
          
          {/* Show Scene Name and Download button when cells are selected */}
          {selectedCells.length > 0 && (
            <>
              <div className="tool-item">
                <label htmlFor="sceneName">Scene Name:</label>
                <input 
                  type="text" 
                  id="sceneName" 
                  value={sceneName} 
                  onChange={handleSceneNameChange}
                />
              </div>
              <div className="tool-item">
                <button onClick={handleDownload}>Download</button>
              </div>
            </>
          )}
        </div>
        
        <div 
          className="image-container"
          ref={imageContainerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{
            cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {/* Image display - only show if there's an image to display */}
          {(uploadedImage || imagePath) && (
            <>
              {imageError ? (
                <div className="fallback-container">
                  <div className="image-error">
                    <p>Error loading image from: {imagePath}</p>
                    <p>Please ensure the file exists and is accessible.</p>
                  </div>
                  <FallbackImage rows={rows || 4} columns={columns || 4} />
                </div>
              ) : (
                <div
                  className="image-wrapper"
                  style={{
                    transform: `translate(${panX}px, ${panY}px) scale(${zoom})`,
                    transformOrigin: 'center center',
                    display: 'inline-block',
                    position: 'relative'
                  }}
                >
                  <img 
                    ref={imageRef}
                    src={uploadedImage || imagePath} 
                    alt="Sprite Sheet" 
                    className="sprite-image"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                    style={{ display: 'block' }}
                  />
                  
                  {/* Grid overlay - positioned inside the image wrapper */}
                  {imageLoaded && rows > 0 && columns > 0 && (
                    <div 
                      className="grid-overlay"
                      style={{
                        width: '100%',
                        height: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        pointerEvents: zoom > 1.5 ? 'none' : 'auto'
                      }}
                    >
                      {Array.from({ length: rows }).map((_, rowIndex) => (
                        Array.from({ length: columns }).map((_, colIndex) => {
                          // Find if this cell is selected
                          const selectedCell = selectedCells.find(cell => 
                            cell.row === rowIndex && cell.col === colIndex
                          );
                          
                          return (
                            <div 
                              key={`${rowIndex}-${colIndex}`}
                              className={`grid-cell ${selectedCell ? 'selected' : ''}`}
                              style={{
                                width: `${100 / columns}%`,
                                height: `${100 / rows}%`,
                                top: `${(rowIndex * 100) / rows}%`,
                                left: `${(colIndex * 100) / columns}%`
                              }}
                              onClick={() => zoom <= 1.5 && handleCellClick(rowIndex, colIndex)}
                            >
                              {selectedCell && (
                                <span className="cell-order">{selectedCell.order}</span>
                              )}
                            </div>
                          );
                        })
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
          
          {/* Selected cells coordinates display */}
          {selectedCells.length > 0 && (
            <div className="selected-cells-info">
              <h3>Selected Cells</h3>
              <div className="cells-list">
                {selectedCells.map((cell, index) => (
                  <div key={index} className="cell-info">
                    <span className="cell-order-badge">{cell.order}</span>
                    <span>Row: {cell.row}, Col: {cell.col}</span>
                  </div>
                ))}
              </div>
              
              {/* Coordinates for next phase */}
              <div className="coordinates-output">
                <h4>Coordinates for Slicing</h4>
                <pre className="coordinates-code">
                  {JSON.stringify(selectedCells.map(cell => ({
                    row: cell.row,
                    col: cell.col,
                    order: cell.order
                  })), null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
