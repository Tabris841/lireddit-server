import { UserNamePasswordInput } from '../resolvers/UserNamePasswordInput';

export const validateRegister = (options: UserNamePasswordInput) => {
  if (!options.email.includes('@')) {
    return [{ field: 'email', message: `invalid email` }];
  }

  if (options.userName.length <= 2) {
    return [{ field: 'userName', message: `length must be greater than 2` }];
  }

  if (options.userName.includes('@')) {
    return [{ field: 'userName', message: `userName cannot include an @` }];
  }

  if (options.password.length <= 2) {
    return [{ field: 'password', message: `length must be greater than 2` }];
  }

  return null;
};
