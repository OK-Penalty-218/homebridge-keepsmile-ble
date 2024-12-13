import {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';
import noble, { Peripheral } from '@abandonware/noble';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
import { ExamplePlatformAccessory } from './platformAccessory.js';

const SERVICE_UUID = "0000afd0-0000-1000-8000-00805f9b34fb";  // LED light strip service UUID
const CHARACTERISTIC_READ_UUID = "0000afd3-0000-1000-8000-00805f9b34fb"; // Read characteristic
const CHARACTERISTIC_WRITE_UUID = "0000afd1-0000-1000-8000-00805f9b34fb"; // Write characteristic
const CHARACTERISTIC_NOTIFY_UUID = "0000afd2-0000-1000-8000-00805f9b34fb"; // Notify characteristic

export class ExampleHomebridgePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service;
  public readonly Characteristic: typeof Characteristic;

  public readonly accessories: PlatformAccessory[] = [];

  private connected: boolean = false;

  constructor(
    public readonly log: Logging,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.Service = api.hap.Service;
    this.Characteristic = api.hap.Characteristic;

    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);
    this.accessories.push(accessory);
  }

discoverDevices() {
noble.on('stateChange', async (state) => {
  if (state === 'poweredOn') {
    await noble.startScanningAsync([], false);  // Scan for all BLE devices
  } else if (state === 'poweredOff') {
    this.log.warn('Bluetooth is powered off, cannot scan for devices.');
    noble.stopScanning();
  }
});

  noble.on('discover', async (peripheral) => {
    // Optional: You can add filters based on advertisement data, if needed
    if (peripheral.advertisement.localName && peripheral.advertisement.localName.includes("KS03")) {
    
    this.log.debug(`Discovered peripheral: ${peripheral.advertisement.localName} - ${peripheral.uuid}`);

    // Generate an accessory UUID (using peripheral info to ensure uniqueness)
    const uuid = this.api.hap.uuid.generate(peripheral.uuid);
    const existingAccessory = this.accessories.find(
      (accessory) => accessory.UUID === uuid
    );

    if (existingAccessory) {
      this.log.info(`Restoring existing accessory from cache: ${existingAccessory.displayName}`);
      new ExamplePlatformAccessory(this, existingAccessory);
    } else {
      this.log.info(`Adding new accessory: ${peripheral.advertisement.localName}`);
      const accessory = new this.api.platformAccessory(
        peripheral.advertisement.localName || 'BLE Light',
        uuid
      );

      accessory.context.device = {
        uuid: peripheral.uuid,
        name: peripheral.advertisement.localName,
      };

      new ExamplePlatformAccessory(this, accessory);
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
      this.log.debug('Accessory added successfully!');
    }

    peripheral.disconnectAsync();
  });
}

async connectAndInteractWithDevice(peripheral: Peripheral) {
  await peripheral.connectAsync();
  
  this.log.info(`Connected to device: ${peripheral.advertisement.localName}`);

  // Discover services and characteristics
  const { characteristics } = await peripheral.discoverSomeServicesAndCharacteristicsAsync(
    ['0000afd0-0000-1000-8000-00805f9b34fb'], // service UUID
    ['0000afd1-0000-1000-8000-00805f9b34fb'], // write characteristic UUID
  );

  const writeCharacteristic = characteristics.find((char) => char.uuid === '0000afd1-0000-1000-8000-00805f9b34fb');

  if (writeCharacteristic) {
    this.log.info('Found write characteristic, interacting with device...');

    // Send data to the device (example)
    const data = Buffer.from('010203040506', 'hex');
    await writeCharacteristic.writeAsync(data);
    this.log.info('Sent data to device.');
  } else {
    this.log.error('Write characteristic not found.');
  }

  // Disconnect after interaction
    await peripheral.disconnectAsync();
}

    this.platform.log.debug('GetWriteCharacteristics OK!');
  }
}
