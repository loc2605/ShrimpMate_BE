import { registerDecorator, ValidationOptions } from 'class-validator';
import { isValidVietnamPhoneNumber } from '../../../common/utils/phone.util';

export function IsVietnamPhoneNumber(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isVietnamPhoneNumber',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isValidVietnamPhoneNumber(value);
        },
        defaultMessage() {
          return 'Số điện thoại không hợp lệ (định dạng Việt Nam, 10 chữ số, bắt đầu bằng 0)';
        },
      },
    });
  };
}
