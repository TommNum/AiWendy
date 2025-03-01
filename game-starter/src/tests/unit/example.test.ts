/**
 * Example test file to verify Jest is working correctly
 */

describe('Basic test example', () => {
  it('should add two numbers correctly', () => {
    expect(1 + 2).toBe(3);
  });
  
  it('should handle string concatenation', () => {
    expect('hello ' + 'world').toBe('hello world');
  });
  
  it('should work with arrays', () => {
    const arr = [1, 2, 3];
    expect(arr.length).toBe(3);
    expect(arr).toContain(2);
  });
  
  it('should work with objects', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj.name).toBe('test');
    expect(obj.value).toBe(42);
  });
});

// Example of an async test
describe('Async test example', () => {
  it('should resolve promises', async () => {
    const result = await Promise.resolve('success');
    expect(result).toBe('success');
  });
  
  it('should handle async/await', async () => {
    const fetchData = async () => {
      return 'data';
    };
    
    const data = await fetchData();
    expect(data).toBe('data');
  });
}); 