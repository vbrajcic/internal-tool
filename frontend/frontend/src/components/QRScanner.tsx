import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  width?: number;
  height?: number;
  fps?: number;
  qrbox?: number;
}

const QRScanner: React.FC<QRScannerProps> = ({
  onScanSuccess,
  onScanError,
  width = 300,
  height = 300,
  fps = 10,
  qrbox = 250,
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const elementId = 'qr-reader';

  useEffect(() => {
    if (!isScanning) return;

    const config = {
      fps,
      qrbox: { width: qrbox, height: qrbox },
      aspectRatio: 1.0,
      supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
    };

    const scanner = new Html5QrcodeScanner(
      elementId,
      config,
      false
    );

    scanner.render(
      (decodedText) => {
        setIsScanning(false);
        onScanSuccess(decodedText);
        scanner.clear();
      },
      (error) => {
        if (onScanError) {
          onScanError(error);
        }
      }
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [isScanning, fps, qrbox, onScanSuccess, onScanError]);

  const startScanning = () => {
    setIsScanning(true);
  };

  const stopScanning = () => {
    setIsScanning(false);
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error);
    }
  };

  return (
    <div className="qr-scanner-container">
      <div className="mb-4 flex gap-2">
        <button
          onClick={startScanning}
          disabled={isScanning}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-gray-400 hover:bg-blue-600 transition-colors"
        >
          {isScanning ? 'Scanning...' : 'Start Scan'}
        </button>
        {isScanning && (
          <button
            onClick={stopScanning}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Stop Scan
          </button>
        )}
      </div>

      <div
        id={elementId}
        style={{ width: `${width}px`, height: `${height}px` }}
        className="mx-auto border-2 border-gray-300 rounded-lg"
      />

      {!isScanning && (
        <div className="mt-4 text-center text-gray-500">
          <p>Click "Start Scan" to begin QR code scanning</p>
          <p className="text-sm">Make sure to allow camera access when prompted</p>
        </div>
      )}
    </div>
  );
};

export default QRScanner;