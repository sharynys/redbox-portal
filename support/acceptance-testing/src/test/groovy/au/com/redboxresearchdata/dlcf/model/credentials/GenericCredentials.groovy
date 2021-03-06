/*
 *
 *  * Copyright (C) 2017 Queensland Cyber Infrastructure Foundation (http://www.qcif.edu.au/)
 *  *
 *  * This program is free software: you can redistribute it and/or modify
 *  * it under the terms of the GNU General Public License as published by
 *  * the Free Software Foundation; either version 2 of the License, or
 *  * (at your option) any later version.
 *  *
 *  * This program is distributed in the hope that it will be useful,
 *  * but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  * GNU General Public License for more details.
 *  *
 *  * You should have received a copy of the GNU General Public License along
 *  * with this program; if not, write to the Free Software Foundation, Inc.,
 *  * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 *
 */

package au.com.redboxresearchdata.dlcf.model.credentials

/**
 * @author Matt Mulholland (matt@redboxresearchdata.com.au)
 * @date 5/7/17
 */
abstract class GenericCredentials {
  def final username
  def final password

  GenericCredentials(def roleName, def credentialsType) {
    if (roleName) {
      username = "REDBOX_${credentialsType}_${roleName}_USERNAME".toUpperCase()
      password = "REDBOX_${credentialsType}_${roleName}_PASSWORD".toUpperCase()
    }
    if (!System.getenv(username)) {
      throw new IllegalStateException("Must define ${username} as system property!")
    }
    if (!System.getenv(password)) {
      throw new IllegalStateException("Must define ${password} as system property!")
    }
    this.username = System.getenv(username)
    this.password = System.getenv(password)
  }

}
