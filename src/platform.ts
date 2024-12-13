import {
  API,
  DynamicPlatformPlugin,
  Logging,
  PlatformAccessory,
  PlatformConfig,
  Service,
  Characteristic,
} from 'homebridge';
import noble from '@abandonware/noble';
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
      this.log.info('Bluetooth powered on, starting to scan for all devices...');
      // Start scanning for all devices, set allowDuplicates to true
      await noble.startScanningAsync([], true);
    } else {
      this.log.error('Bluetooth is not powered on.');
    }
  });

  noble.on('discover', async (peripheral) => {
    // Log discovered device details
    this.log.debug(`Discovered device: Name: ${peripheral.advertisement.localName}, UUID: ${peripheral.uuid}`);
    this.log.debug(`Advertisement: ${JSON.stringify(peripheral.advertisement)}`);
    
    // Check if the peripheral is advertising the desired service (e.g., the service UUID for your LED strips)
    const serviceUUIDs = ['0000afd0-0000-1000-8000-00805f9b34fb'];  // Example service UUID
    const matchesService = peripheral.advertisement.serviceUuids.some((serviceUUID) =>
      serviceUUIDs.includes(serviceUUID)
    );

    if (matchesService) {
      this.log.success(`Found a matching device with service UUID: ${peripheral.uuid}`);

      // Stop scanning once the device is found (optional)
      await noble.stopScanningAsync();

      // Generate UUID for the accessory using the peripheral's local name
      const uuid = this.api.hap.uuid.generate(peripheral.advertisement.localName || 'Unknown Device');
      const existingAccessory = this.accessories.find((accessory) => accessory.UUID === uuid);

      if (existingAccessory) {
        this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
        new ExamplePlatformAccessory(this, existingAccessory);
      } else {
        this.log.info('Setting up new accessory...');
        const accessoryName = peripheral.advertisement.localName || 'Light Strip'; // Use the name broadcast by the device
        const accessory = new this.api.platformAccessory(accessoryName, uuid);
        accessory.context.device = {
          hkid: uuid,
          uuid: peripheral.uuid,
          name: peripheral.advertisement.localName,
        };
        new ExamplePlatformAccessory(this, accessory);
        this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [accessory]);
        this.log.debug('Accessory registration successful!');
      }

      // Once done, disconnect the peripheral
      await peripheral.disconnectAsync();
    }
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
