#!/usr/bin/env python3
# Copyright (c) 2015-2021 The Bitcoin Core developers
# Distributed under the MIT software license, see the accompanying
# file COPYING or http://www.opensource.org/licenses/mit-license.php.

from argparse import ArgumentParser
from base64 import urlsafe_b64encode
from getpass import getpass
from os import urandom

import os
import hmac

def generate_salt(size):
    """Create size byte hex salt"""
    return urandom(size).hex()

def generate_password():
    """Create 32 byte b64 password"""
    return urlsafe_b64encode(urandom(32)).decode('utf-8')

def password_to_hmac(salt, password):
    m = hmac.new(bytearray(salt, 'utf-8'), bytearray(password, 'utf-8'), 'SHA256')
    return m.hexdigest()

def main():

    confPath = os.path.join(os.path.dirname(__file__), './bitcoin.conf')

    confRead = open(confPath, 'r')

    lines = confRead.readlines()
    for line in lines:
        if line.startswith("rpcauth"):
            confRead.close() 
            print('rpcauth already defined in bitcoin.conf, terminating early')
            quit()

    confRead.close()                    

    parser = ArgumentParser(description='Create login credentials for a JSON-RPC user')
    parser.add_argument('username', help='the username for authentication')
    parser.add_argument('password', help='leave empty to generate a random password or specify "-" to prompt for password', nargs='?')
    args = parser.parse_args()

    if not args.password:
        args.password = generate_password()
    elif args.password == '-':
        args.password = getpass()

    # Create 16 byte hex salt
    salt = generate_salt(16)
    password_hmac = password_to_hmac(salt, args.password)

    print('String to be appended to bitcoin.conf:')
    print('rpcauth={0}:{1}${2}'.format(args.username, salt, password_hmac))
    print('Your password:\n{0}'.format(args.password))

    confWrite = open(confPath, 'a+')
    confWrite.write('\n\n#rpcauth\nrpcauth={0}:{1}${2}\n'.format(args.username, salt, password_hmac))
    confWrite.close()

if __name__ == '__main__':
    main()
