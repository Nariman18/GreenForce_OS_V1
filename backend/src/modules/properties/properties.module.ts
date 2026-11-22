import { Module } from '@nestjs/common';
import { DemoPropertyProvider } from './demo/demo-property.provider.js';
import { PropertiesController } from './properties.controller.js';
import { PropertiesService } from './properties.service.js';
import { PROPERTY_DATA_PROVIDER } from './property-provider.js';

@Module({
  controllers: [PropertiesController],
  providers: [PropertiesService, { provide: PROPERTY_DATA_PROVIDER, useClass: DemoPropertyProvider }],
  exports: [PropertiesService],
})
export class PropertiesModule {}
