const properties = [];

export const addProperty = (title, description, price, photos = []) => {
  const newProperty = {
    id: properties.length + 1,
    title,
    description,
    price,
    photos,
  };
  properties.push(newProperty);
  return newProperty;
};

export const getProperties = () => properties;
