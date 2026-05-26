#include <errno.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

static void print_usage(const char *program_name) {
  fprintf(stderr, "Usage: %s <input_file> <output_file> [hex_key]\n", program_name);
}

int main(int argc, char **argv) {
  if (argc < 3 || argc > 4) {
    print_usage(argv[0]);
    return 1;
  }

  const char *input_path = argv[1];
  const char *output_path = argv[2];
  unsigned int key = 0xAA;

  if (argc == 4) {
    key = (unsigned int)strtoul(argv[3], NULL, 16);
    key &= 0xFF;
  }

  FILE *in = fopen(input_path, "rb");
  if (!in) {
    fprintf(stderr, "Failed to open input: %s\n", strerror(errno));
    return 1;
  }

  FILE *out = fopen(output_path, "wb");
  if (!out) {
    fprintf(stderr, "Failed to open output: %s\n", strerror(errno));
    fclose(in);
    return 1;
  }

  int byte = fgetc(in);
  while (byte != EOF) {
    uint8_t decrypted = ((uint8_t)byte) ^ ((uint8_t)key);
    if (fputc((int)decrypted, out) == EOF) {
      fprintf(stderr, "Write failed: %s\n", strerror(errno));
      fclose(in);
      fclose(out);
      return 1;
    }
    byte = fgetc(in);
  }

  if (ferror(in)) {
    fprintf(stderr, "Read failed: %s\n", strerror(errno));
    fclose(in);
    fclose(out);
    return 1;
  }

  fclose(in);
  fclose(out);
  printf("Decryption complete: %s\n", output_path);
  return 0;
}
