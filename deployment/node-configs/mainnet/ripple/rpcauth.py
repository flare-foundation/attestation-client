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

    confPath = os.path.join(os.path.dirname(__file__), './rippled.conf')

    confRead = open(confPath, 'r')

    lines = confRead.readlines()
    for line in lines:
        if line.startswith("password"):
            confRead.close() 
            print('password already defined in rippled.conf, terminating early')
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

    print('String to be appended to rippled.conf:')
    print('user = {0}'.format(args.username))
    print('password = {0}'.format(args.password))
    print('Your password:\n{0}'.format(args.password))

    # Insert after [port_rpc_admin_local] and [port_ws_admin_local]
    with open(confPath, "r") as f:
        contents = f.readlines()

    indexRpc = contents.index('[port_rpc_admin_local]\n') + 1 
    contents.insert(indexRpc, 'user={0}'.format(args.username)+"\n")
    contents.insert(indexRpc, 'password={0}'.format(args.password)+"\n")

    indexWs = contents.index('[port_ws_admin_local]\n') + 1
    contents.insert(indexWs, 'user={0}'.format(args.username)+"\n")
    contents.insert(indexWs, 'password={0}'.format(args.password)+"\n")

    with open(confPath, "w") as f:
        contents = "".join(contents)
        f.write(contents)

if __name__ == '__main__':
    main()
