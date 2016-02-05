/* Convert corner and center pixels to geographical coordinates */
module.exports = function( x, y, wid, hei, reference_coordinates ){
  delta_lon = Math.abs( reference_coordinates.upper_right.lon - reference_coordinates.upper_left.lon )
  delta_lat = Math.abs( reference_coordinates.upper_right.lat - reference_coordinates.bottom_right.lat )
  offset_lon = x * delta_lon / wid;
  offset_lat = y * delta_lat / hei;
  return {lon: reference_coordinates.upper_left.lon + offset_lon, lat: reference_coordinates.upper_right.lat - offset_lat}
}
